import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Cake, Gem, Heart, LayoutGrid, Play } from "lucide-react";
import { AtriumScene } from "@/components/art/AtriumScene";
import { OrnamentDivider } from "@/components/ornaments/Divider";
import { SearchBar } from "@/components/shop/SearchBar";
import { Button } from "@/components/ui/Button";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

const OCCASIONS = [
  { label: "Birthday", href: "/categories/birthday", icon: Cake },
  { label: "Anniversary", href: "/categories/anniversary", icon: Heart },
  { label: "Wedding", href: "/categories/wedding", icon: Gem },
  { label: "Corporate", href: "/categories/corporate-gifting", icon: Briefcase },
  { label: "More", href: "/categories", icon: LayoutGrid },
] as const;

/** The mall's front door: the atrium photo runs the full width of the page (the client's own approved mockup), the headline sitting directly on it behind a
 * scrim, and a search card floating over the seam where the photo ends. */
export async function HomeHero() {
  const theme = await getActiveTheme();
  const hero = siteImage("hero-atrium", theme.id);
  const heroMobile = siteImage("hero-atrium-mobile", theme.id);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0" aria-hidden={hero ? undefined : true}>
          {hero ? (
            <picture className="absolute inset-0 block">
              {heroMobile ? <source media="(max-width: 1023px)" srcSet={heroMobile.src} /> : null}
              <Image src={hero.src} alt="A warmly lit gifting mall atrium with hanging gift boxes" fill priority sizes="100vw" className="object-cover object-center" />
            </picture>
          ) : (
            <>
              {/* only the phone picture exists so far: show it on phones, and the drawn atrium on wide screens */}
              {heroMobile ? (
                <Image src={heroMobile.src} alt="A warmly lit gifting mall atrium with hanging gift boxes" fill priority sizes="100vw" className="object-cover object-center lg:hidden" />
              ) : null}
              <AtriumScene className={`absolute inset-0 h-full w-full ${heroMobile ? "hidden lg:block" : ""}`} />
            </>
          )}
          <div className="gp-hero-scrim absolute inset-0" aria-hidden="true" />
        </div>

        <div className="relative flex min-h-[30rem] flex-col justify-end px-4 pb-24 pt-28 sm:min-h-[34rem] sm:px-6 sm:pb-28 lg:min-h-[640px] lg:justify-center lg:pb-32 lg:pt-24">
          <div className="mx-auto w-full max-w-7xl lg:px-2">
            <div className="max-w-xl">
              <div className="gp-hero-copy rise">
                <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-brand-secondary">Welcome to GiftPing Mall</p>
                <h1 className="mt-4 font-heading text-[2.6rem] leading-[1.05] text-brand-on-primary sm:text-6xl lg:text-[4.2rem]">
                  A World of Gifts.
                  <br />A World of <span className="accent-word">Emotions.</span>
                </h1>
                <span className="mt-6 block h-0.5 w-12 rounded-full bg-brand-secondary" aria-hidden="true" />
                <p className="mt-6 max-w-md text-base leading-relaxed text-brand-on-primary/80 sm:text-lg">
                  Step into a premium gifting destination where every gift tells a story.
                </p>
              </div>
              <div className="rise mt-8 flex flex-wrap gap-3" style={{ "--rise-delay": "140ms" } as React.CSSProperties}>
                <Button size="lg" asChild>
                  <Link href="/mall">Explore the Mall <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="border-brand-on-primary/50 bg-brand-primary-dark/35 text-brand-on-primary shadow-lift backdrop-blur-[2px] hover:border-brand-on-primary hover:bg-brand-primary-dark/55" asChild>
                  <Link href="/about">Watch Our Story <Play className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 sm:px-6 lg:-mt-20">
        <div className="rise" style={{ "--rise-delay": "260ms" } as React.CSSProperties}>
          <div className="grid items-center gap-4 rounded-card border border-brand-dark/[0.06] bg-brand-surface p-3 shadow-lift lg:grid-cols-[minmax(0,1fr)_auto] lg:p-4">
            <SearchBar className="w-full" />
            <ul className="grid grid-cols-5 gap-1 lg:divide-x lg:divide-brand-dark/[0.07]">
              {OCCASIONS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <Link href={href} className="group flex flex-col items-center gap-1.5 rounded-button px-2 py-2 text-center text-[11px] text-brand-dark/80 transition-colors duration-300 hover:bg-brand-accent sm:px-4 sm:text-xs">
                    <Icon className="h-5 w-5 text-brand-secondary transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <OrnamentDivider className="mt-10 hidden sm:flex" />
      </div>
    </>
  );
}
