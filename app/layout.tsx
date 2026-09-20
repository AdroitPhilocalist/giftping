import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/Toast";
import { OneSignalIdentity } from "@/components/shop/OneSignalIdentity";
import { getServerUser } from "@/lib/auth/session";
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
          {user && oneSignalAppId ? <OneSignalIdentity appId={oneSignalAppId} userId={user.id} /> : null}
        </TooltipProvider>
      </body>
    </html>
  );
}
