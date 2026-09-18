import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VENDOR_PUBLIC_PATHS = ["/vendor/register"];

function isProtectedCustomerPath(pathname: string) {
  return (
    pathname.startsWith("/account") ||
    pathname.startsWith("/diary") ||
    pathname.startsWith("/checkout")
  );
}

// Matches the /vendor/* portal (vendor/admin only) without also matching /vendors/* — the
// public shop's vendor storefront pages. `startsWith("/vendor")` alone catches both, since
// "/vendors/aurelia-gifts" starts with the substring "/vendor" too — confirmed by hand-testing
// (a signed-in customer got silently bounced from a public storefront page).
function isVendorPath(pathname: string) {
  return (
    (pathname === "/vendor" || pathname.startsWith("/vendor/")) &&
    !VENDOR_PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  );
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

function isAuthPath(pathname: string) {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

// This is an "optimistic" check per Supabase's own guidance (see
// app/guides/authentication#optimistic-checks-with-proxy-optional in the Next.js docs
// bundled with this repo's node_modules): it's a fast UI-level redirect for a better
// experience, NOT the actual security boundary. Every protected Server Component/Server
// Action/Route Handler must still call requireRole() from lib/auth/session.ts — that is
// what a request can't bypass, since it re-reads the role from the database server-side.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

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

  if (user && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const needsAuth = isProtectedCustomerPath(pathname) || isVendorPath(pathname) || isAdminPath(pathname);

  if (needsAuth && !user) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if ((isVendorPath(pathname) || isAdminPath(pathname)) && user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (isAdminPath(pathname) && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (isVendorPath(pathname) && role !== "vendor" && role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
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
