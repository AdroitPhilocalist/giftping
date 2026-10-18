"use server";

import { headers } from "next/headers";
import { getRequestIp } from "@/lib/auth/request-ip";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { MARKETING_NOTICE_VERSION } from "@/lib/marketing/consent";
import { mergeGuestCartIntoUser } from "@/lib/commerce/cart";
import { postLoginPath } from "@/lib/auth/redirect";
import { authRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { notifyUser } from "@/lib/notifications/notify";
import { buildWelcomeEmail } from "@/lib/notifications/templates";
import {
  signUpSchema,
  signInSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth.schema";

export interface ActionResult {
  error?: string;
  success?: string;
}

async function enforceAuthRateLimit(): Promise<string | null> {
  const ip = await getRequestIp();
  const result = await checkRateLimit(authRateLimit, ip);
  if (!result.success) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  return null;
}

/**
 * The origin to send an auth redirect (OAuth callback, email confirmation, password reset) back to.
 * MUST prefer the real request's own origin over `NEXT_PUBLIC_APP_URL` — that env var holds the
 * production URL and is set in `.env.local` too (so the same file works for both `npm run dev` and
 * Vercel), which used to make it win unconditionally: signing in with Google from localhost sent the
 * browser to the *production* callback instead of back to localhost, silently leaving the local tab on
 * its old (or no) session while the real one was established on a different origin's cookies — looking
 * like another account's data, or stayed signed out. A real browser request always carries an `Origin`
 * header, so that is checked first; `NEXT_PUBLIC_APP_URL` (and then localhost) are only a fallback for
 * the rare caller with no origin header (e.g. a non-browser client).
 */
async function getAppUrl(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin");
  return origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const rateLimitError = await enforceAuthRateLimit();
  if (rateLimitError) return { error: rateLimitError };

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();
  // An UNTICKED-by-default checkbox: only an explicit tick counts (a missing or any other value is "no").
  const wantsMarketing = formData.get("marketingOptIn") === "on";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // The tick is held as a PENDING choice and only recorded as consent once the email address is confirmed (auth/callback), so
      // typing someone else's address and ticking the box can't subscribe them. The notice version they were shown travels with it.
      data: { full_name: parsed.data.fullName, ...(wantsMarketing ? { marketing_opt_in_pending: true, marketing_notice_version: MARKETING_NOTICE_VERSION } : {}) },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    // Generic message to the client; full detail goes to Sentry via the SDK's automatic
    // capture, never surfaced raw to avoid leaking internals (e.g. whether an email exists).
    return { error: "Couldn't create your account. Please check your details and try again." };
  }

  // Sent once, right here — signUpAction is only ever reached for a genuinely new account, so there's no
  // "is this actually new" ambiguity the way there is in the OAuth callback (which also handles returning
  // sign-ins and this same email-confirmation link, later, for the same account).
  if (data.user) {
    const appUrl = await getAppUrl();
    await notifyUser({
      userId: data.user.id, category: "account", type: "welcome", title: "Welcome to GiftPing",
      message: "Glad you're here — explore the mall, or start your Personal Gifting Diary.", linkUrl: "/mall",
      email: buildWelcomeEmail({ firstName: parsed.data.fullName.split(" ")[0], mallUrl: `${appUrl}/mall`, diaryUrl: `${appUrl}/diary`, preferencesUrl: `${appUrl}/account/notifications` }),
    });
  }

  if (!data.session) {
    return { success: "Check your email to confirm your account before signing in." };
  }

  // Email confirmation is switched off in this project, so the person is signed in already: record the choice now.
  if (data.user && wantsMarketing) {
    await createAdminClient().rpc("set_marketing_consent", { p_user_id: data.user.id, p_opt_in: true, p_source: "signup", p_notice_version: MARKETING_NOTICE_VERSION });
  }
  if (data.user) await mergeGuestCartIntoUser(data.user.id);
  redirect("/");
}

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const rateLimitError = await enforceAuthRateLimit();
  if (rateLimitError) return { error: rateLimitError };

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  // Carry anything they put in a guest cart over to their account before landing anywhere.
  if (data.user) await mergeGuestCartIntoUser(data.user.id);

  // They may have been bounced here from a page that needs a role they don't have (a customer
  // following /vendor/dashboard). Resolve the destination against the role from the database —
  // never a role claim from the client — so the browser is only sent somewhere it can actually
  // land, rather than being bounced by proxy.ts mid-redirect. See postLoginPath.
  let role = "customer";
  if (data.user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).maybeSingle();
    role = profile?.role ?? "customer";
  }
  redirect(postLoginPath(formData.get("redirectTo"), role));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createClient();
  const appUrl = await getAppUrl();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl}/auth/callback` },
  });

  if (error || !data.url) {
    redirect("/sign-in?error=oauth_failed");
  }

  redirect(data.url);
}

export async function requestPasswordResetAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const rateLimitError = await enforceAuthRateLimit();
  if (rateLimitError) return { error: rateLimitError };

  const parsed = resetPasswordRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const appUrl = await getAppUrl();

  // The link goes through /auth/callback (a Route Handler) rather than straight to /update-password:
  // the PKCE code exchange has to set the session cookies, and only a Route Handler or Server Action
  // can do that. `next` carries the recovery destination so the callback knows where to send the
  // freshly-exchanged (now signed-in) user. See app/auth/callback/route.ts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/update-password`,
  });

  // Always the same response whether or not the email exists — avoids leaking which
  // addresses are registered.
  return { success: "If an account exists for that email, a reset link has been sent." };
}

export async function updatePasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: "Couldn't update your password. Your reset link may have expired." };
  }

  // A reset is exactly the moment an attacker's still-live session must die, so revoke every OTHER
  // session (scope "others" keeps this one — the person is mid-flow and lands signed in). Best-effort
  // by design: the password is already changed, so a failed revoke must never read as a failed reset.
  await supabase.auth.signOut({ scope: "others" }).catch(() => {});

  redirect("/");
}
