import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAdminPath, isAuthPath, isProtectedCustomerPath, isVendorPath } from "@/lib/auth/paths";

const CSP_HEADER = "Content-Security-Policy";

// Every response gets a fresh per-request nonce; Next.js reads it back out of this header itself
// and auto-applies it to its own framework/page scripts (see docs/progress/2026-09-28-csp.md) —
// nothing to wire for those. The one hand-loaded third-party script (OneSignal's next/script in
// components/shop/OneSignalIdentity.tsx) needs the nonce passed explicitly; RootLayout reads it
// back via headers().get("x-nonce"). 'strict-dynamic' means a script this trusted bundle inserts
// at runtime (Razorpay's checkout.js via document.createElement in PayNowButton, OneSignal's own
// JSONP config fetch) is trusted too, without listing those hosts in script-src by name — that's
// what lets a payment SDK and a push SDK load without a broad host allowlist. Fonts are self-hosted
// via next/font (no fonts.googleapis.com needed); Tailwind's compiled stylesheet is a same-origin
// file. style-src allows 'unsafe-inline' deliberately: ~40 components set dynamic style={{}} values
// (percentages, hues, computed sizes) from server data/theme tokens, never raw user text, and
// Safari doesn't support style-src-attr (the finer-grained alternative) — so a strict style-src
// would just silently misrender across the site for one browser with no real XSS benefit here.
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== "production";
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";
  const sentryHost = process.env.NEXT_PUBLIC_SENTRY_DSN ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).hostname : "";

  const imgSrc = ["'self'", "blob:", "data:", supabaseHost && `https://${supabaseHost}`].filter(Boolean).join(" ");
  const connectSrc = [
    "'self'",
    supabaseHost && `https://${supabaseHost}`,
    sentryHost && `https://${sentryHost}`,
    "https://api.razorpay.com",
    "https://lumberjack.razorpay.com",
    "https://api.onesignal.com",
    "https://onesignal.com",
    "https://*.onesignal.com",
    "wss://*.onesignal.com",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src ${imgSrc}`,
    `font-src 'self'`,
    `connect-src ${connectSrc}`,
    `frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

// This is an "optimistic" check per Supabase's own guidance (see
// app/guides/authentication#optimistic-checks-with-proxy-optional in the Next.js docs
// bundled with this repo's node_modules): it's a fast UI-level redirect for a better
// experience, NOT the actual security boundary. Every protected Server Component/Server
// Action/Route Handler must still call requireRole() from lib/auth/session.ts — that is
// what a request can't bypass, since it re-reads the role from the database server-side.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Carries any refreshed session cookies (set above via setAll) onto a redirect response too —
  // those cookies live on `response`, so returning a bare NextResponse.redirect() would drop them.
  function redirect(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    redirectResponse.headers.set(CSP_HEADER, csp);
    return redirectResponse;
  }

  if (user && isAuthPath(pathname)) {
    return redirect(new URL("/", request.url));
  }

  const needsAuth = isProtectedCustomerPath(pathname) || isVendorPath(pathname) || isAdminPath(pathname);

  if (needsAuth && !user) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return redirect(redirectUrl);
  }

  if ((isVendorPath(pathname) || isAdminPath(pathname)) && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (isAdminPath(pathname) && role !== "admin") {
      return redirect(new URL("/", request.url));
    }

    if (isVendorPath(pathname) && role !== "vendor" && role !== "admin") {
      return redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, images, and other static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
