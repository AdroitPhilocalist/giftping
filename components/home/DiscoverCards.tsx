import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookHeart, Gift, Heart, Store } from "lucide-react";
import { DiaryArt } from "@/components/art/DiaryArt";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { ShopfrontArt } from "@/components/art/ShopfrontArt";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { siteImage, type ImageKey } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

const CARDS: { key: ImageKey; title: string; text: string; cta: string; href: string; icon: typeof Gift; dark?: boolean; art: "collections" | "boutiques" | "diary" | "services" }[] = [
  { key: "card-collections", title: "Premium Collections", text: "Handpicked gifts that speak elegance and thoughtfulness.", cta: "Explore Now", href: "/categories", icon: Gift, dark: true, art: "collections" },
  { key: "card-boutiques", title: "Boutique Stores", text: "Curated boutiques from trusted brands and artisans.", cta: "Shop Boutiques", href: "/vendors", icon: Store, art: "boutiques" },
  { key: "card-diary", title: "Personal Gifting Diary", text: "Remember every special day. We'll remind you with love.", cta: "Open My Diary", href: "/diary", icon: BookHeart, dark: true, art: "diary" },
  { key: "card-services", title: "Gifting Services", text: "Gift wrapping, messages, and delightful surprises.", cta: "Learn More", href: "/categories", icon: Heart, art: "services" },
];

export async function DiscoverCards() {
  const theme = await getActiveTheme();
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="Curated with love" title="Discover Meaningful Gifting" subtitle="Explore handpicked collections, premium boutiques and unforgettable experiences crafted for every relationship and every occasion." />
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, i) => {
          const img = siteImage(card.key, theme.id);
          const Icon = card.icon;
          return (
            <Reveal key={card.title} delay={i * 90}>
              <Link href={card.href} className="group block h-full overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-surface shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                <div className="relative h-44">
                  <div className={`absolute inset-0 overflow-hidden ${card.art === "boutiques" && !img ? "bg-gradient-to-b from-brand-primary-dark to-brand-primary" : "bg-brand-accent"}`}>
                  <div className="relative h-full w-full transition-transform duration-700 ease-out group-hover:scale-105">
                    {img ? (
                      <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                    ) : card.art === "boutiques" ? (
                      <ShopfrontArt name="Aurelia" />
                    ) : card.art === "diary" ? (
                      <DiaryArt />
                    ) : (
                      <div className="flex h-full items-end justify-center bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent">
                        <GiftBoxArt tone={card.art === "collections" ? "green" : "copper"} className="mb-3 w-28" />
                      </div>
                    )}
                  </div>
                  </div>
                  <span className={`absolute bottom-0 left-5 z-10 flex h-11 w-11 translate-y-1/2 items-center justify-center rounded-full shadow-card ring-4 ring-brand-surface ${card.dark ? "bg-brand-primary text-brand-on-primary" : "bg-brand-secondary text-brand-on-secondary"}`}>
                    <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                </div>
                <div className="px-5 pb-5 pt-9">
                  <h3 className="font-heading text-xl text-brand-dark">{card.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/65">{card.text}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary-dark">
                    {card.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
