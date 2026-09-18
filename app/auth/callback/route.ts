import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";

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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_failed`);
}
