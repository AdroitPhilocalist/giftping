import Link from "next/link";
import { BellRing, BookHeart, Heart, MapPin, PackageSearch, Star, User, type LucideIcon } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { DataExportSection } from "@/components/shop/DataExportSection";
import { DeleteAccountSection } from "@/components/shop/DeleteAccountSection";
import { Jaali } from "@/components/ornaments/Jaali";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "My Account — GiftPing" };

const TILES: { href: string; icon: LucideIcon; title: string; text: string }[] = [
  { href: "/account/profile", icon: User, title: "Profile", text: "Your name, contact number, and photo." },
  { href: "/orders", icon: PackageSearch, title: "My orders", text: "Track parcels, ask for a return, see your history." },
  { href: "/diary", icon: BookHeart, title: "Gifting diary", text: "The people and dates you never want to miss." },
  { href: "/wishlist", icon: Heart, title: "Wishlist", text: "Things you've loved along the way." },
  { href: "/account/reviews", icon: Star, title: "My reviews", text: "See and edit what you've written." },
  { href: "/account/addresses", icon: MapPin, title: "Saved addresses", text: "Where your gifts should go." },
  { href: "/account/notifications", icon: BellRing, title: "Notifications", text: "Choose which emails and alerts you get." },
];

export default async function AccountPage() {
  const user = await requireRole("customer", "vendor", "admin");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-card border border-brand-secondary/20 bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent">
        <Jaali className="opacity-[0.07]" />
        <div className="relative flex items-center justify-between gap-6 px-6 py-8 sm:px-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">My account</p>
            <h1 className="mt-2 font-heading text-4xl text-brand-dark">Hello, <span className="accent-word">{user.fullName.split(" ")[0]}</span></h1>
            <p className="mt-2 text-sm text-brand-dark/65">{user.email}{user.role !== "customer" ? ` · ${user.role}` : ""}</p>
          </div>
          <Robin className="float-slow hidden w-24 sm:block" />
        </div>
      </section>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TILES.map(({ href, icon: Icon, title, text }) => (
          <li key={href}>
            <Link href={href} className="group flex h-full items-start gap-4 rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>
              <span>
                <span className="block font-heading text-lg text-brand-dark">{title}</span>
                <span className="mt-0.5 block text-sm text-brand-dark/60">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <DataExportSection />
      {user.role === "admin" ? null : <DeleteAccountSection />}
    </div>
  );
}
