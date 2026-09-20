import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/Toast";
import { OneSignalIdentity } from "@/components/shop/OneSignalIdentity";
import { getServerUser } from "@/lib/auth/session";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/Tooltip";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GiftPing — Your Companion for Every Occasion",
  description:
    "A premium virtual gifting mall. Discover in-house and partner-vendor gifts for every occasion, and keep a personal Gifting Diary so you never miss a moment that matters.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getServerUser();
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  // OneSignal's SDK refuses to run anywhere but the site address configured in its dashboard, so on localhost it only throws console errors.
  const host = ((await headers()).get("host") ?? "").split(":")[0];
  const pushSdkAllowed = host !== "localhost" && host !== "127.0.0.1";
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <TooltipProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
          {user && oneSignalAppId && pushSdkAllowed ? <OneSignalIdentity appId={oneSignalAppId} userId={user.id} /> : null}
        </TooltipProvider>
      </body>
    </html>
  );
}
