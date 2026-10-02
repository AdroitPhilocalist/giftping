import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { mergeGuestCartIntoUser } from "@/lib/commerce/cart";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { notifyUser } from "@/lib/notifications/notify";
import { buildWelcomeEmail } from "@/lib/notifications/templates";

// Landing point for both Google OAuth and email-confirmation links (both use Supabase's
// PKCE `code` exchange flow). Password reset does NOT come through here — see
// app/(auth)/update-password/page.tsx, which exchanges its own code directly since Supabase
// appends it straight to the resetPasswordForEmail redirectTo URL.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (data.user) {
        await mergeGuestCartIntoUser(data.user.id);
        // The welcome email for the email/password path is sent from signUpAction itself, at the actual
        // moment of registration — this route also handles THAT SAME account's later confirmation-link
        // click, which must not re-send it. A brand-new Google OAuth account is created and signed in
        // within the same instant, so created_at and last_sign_in_at land within a few seconds of each
        // other here; a delayed email confirmation click (at least the time it takes to open an inbox)
        // or any later, ordinary sign-in will not.
        const created = data.user.created_at ? new Date(data.user.created_at).getTime() : 0;
        const lastSignIn = data.user.last_sign_in_at ? new Date(data.user.last_sign_in_at).getTime() : 0;
        if (created && lastSignIn && Math.abs(lastSignIn - created) < 5000) {
          const { data: profile } = await supabase.from("users").select("full_name").eq("id", data.user.id).maybeSingle();
          const appUrl = origin;
          await notifyUser({
            userId: data.user.id, category: "account", type: "welcome", title: "Welcome to GiftPing",
            message: "Glad you're here — explore the mall, or start your Personal Gifting Diary.", linkUrl: "/mall",
            email: buildWelcomeEmail({ firstName: (profile?.full_name ?? "there").split(" ")[0], mallUrl: `${appUrl}/mall`, diaryUrl: `${appUrl}/diary`, preferencesUrl: `${appUrl}/account/notifications` }),
          });
        }
      }
      return NextResponse.redirect(`${origin}${safeRedirectPath(next)}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
