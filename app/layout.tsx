import { SEO_PAGES } from "@/lib/seo/pages";
import { baseOpenGraph, siteUrl } from "@/lib/seo/site";
import type { Metadata } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/Toast";
import { OneSignalIdentity } from "@/components/shop/OneSignalIdentity";
import { getServerUser } from "@/lib/auth/session";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ThemePreviewStrip } from "@/components/admin/ThemePreviewStrip";
import { CartFlyLayer } from "@/components/motion/CartFlyLayer";
import { FestivalFx } from "@/components/festival/FestivalFx";
import { Ambience } from "@/components/shop/Ambience";
import { festivalForTheme } from "@/lib/festivals/calendar";
import { RobinCursor } from "@/components/motion/RobinCursor";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { getThemePreviewOverride } from "@/lib/theme/preview";
import { resolveTheme } from "@/lib/theme/themes";
import "./globals.css";

// Display serif (headlines; the italic carries the emotional accent words) and a warm geometric sans for everything else.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// The home page's own title/description come from lib/seo/pages.ts (admin-editable in /admin/seo); this is the site-wide fallback and the base every
// relative canonical / share-card URL resolves against.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SEO_PAGES[0].title,
  description: SEO_PAGES[0].description,
  // No title/description here on purpose: a page that sets no share card of its own inherits this object whole, and a title here would show on
  // every such page as the HOME page's. Next fills the share title from each page's own <title> when this has none.
  openGraph: baseOpenGraph(),
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getServerUser();
  const [theme, previewId] = await Promise.all([getActiveTheme(), getThemePreviewOverride()]);
  const festival = festivalForTheme(theme.id);
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const requestHeaders = await headers();
  // OneSignal's SDK refuses to run anywhere but the site address configured in its dashboard, so on localhost it only throws console errors.
  const host = (requestHeaders.get("host") ?? "").split(":")[0];
  const pushSdkAllowed = host !== "localhost" && host !== "127.0.0.1";
  // Set by proxy.ts on every request, for the CSP's per-request script-src nonce — next/script needs it passed
  // explicitly (Next only auto-applies the nonce to its own framework/page bundles, not third-party <Script>s).
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-theme={theme.id}
      className={`${newsreader.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          <Navbar />
          {/* Matches .gp-header's own height exactly (globals.css) — the header is `fixed`, so it no longer reserves this space itself; every
              page needs it back as padding, except the homepage hero, which cancels it again with a negative margin to bleed under the header. */}
          <main className="flex-1 pt-[5.5rem] lg:pt-[6.5rem]">{children}</main>
          <Footer />
          <Toaster />
          {user && oneSignalAppId && pushSdkAllowed ? (
            <OneSignalIdentity appId={oneSignalAppId} userId={user.id} nonce={nonce} />
          ) : null}
          {previewId ? <ThemePreviewStrip label={resolveTheme(previewId).label} /> : null}
          <RobinCursor markSrc={siteImage("robin-perched", theme.id)?.src ?? null} />
          <CartFlyLayer />
          {festival ? <FestivalFx><Ambience kind={festival.ambience} count={12} /></FestivalFx> : null}
        </TooltipProvider>
      </body>
    </html>
  );
}
