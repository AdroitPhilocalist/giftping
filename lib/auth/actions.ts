"use server";

import { headers } from "next/headers";
import { getRequestIp } from "@/lib/auth/request-ip";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { authRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
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

async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const headerList = await headers();
  const origin = headerList.get("origin");
  return origin ?? "http://localhost:3000";
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

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    // Generic message to the client; full detail goes to Sentry via the SDK's automatic
    // capture, never surfaced raw to avoid leaking internals (e.g. whether an email exists).
    return { error: "Couldn't create your account. Please check your details and try again." };
  }

  if (!data.session) {
    return { success: "Check your email to confirm your account before signing in." };
  }

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
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/");
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

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/update-password`,
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

  redirect("/");
}
