import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { SectionHeading } from "@/components/home/SectionHeading";
import { MallDirectory } from "@/components/mall/MallDirectory";
import { Reveal } from "@/components/motion/Reveal";
import { Jaali } from "@/components/ornaments/Jaali";
import { Button } from "@/components/ui/Button";
import { siteImage } from "@/lib/content/imagery";
import { MALL_ZONES } from "@/lib/mall";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata = {
  title: "The Mall Directory — GiftPing",
  description: "Explore the GiftPing mall: Birthday World, Wedding Pavilion, Boutique Avenue and more — every place a doorway to thoughtful gifting.",
};

/** A destination's picture: the occasion "world" banner for its category (world-birthday…), or world-<zone id> for places that aren't a category (world-boutiques). */
function zoneArt(id: string, href: string, themeId: string) {
  const slug = href.startsWith("/categories/") ? href.slice("/categories/".length) : id;
  return siteImage(`world-${slug}`, themeId);
}

export default async function MallPage() {
  const theme = await getActiveTheme();
  const themeId = theme.id;
  const image = siteImage("mall-map", theme.id);
  // hovering a place shows its "interior": the occasion world picture (or world-<id> for places that are not a category)
  const previews: Record<string, string> = {};
  for (const z of MALL_ZONES) {
    const art = zoneArt(z.id, z.href, themeId) ?? (z.id === "entrance" ? siteImage("hero-atrium", themeId) : null);
    if (art) previews[z.id] = art.src;
  }
  const featured = MALL_ZONES.filter((z) => ["birthday", "boutiques", "wedding", "atrium"].includes(z.id));

  return (
    <div className="relative overflow-hidden">
      <Jaali className="opacity-[0.035]" />
      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <div className="mb-8 max-w-md lg:absolute lg:left-8 lg:top-24 lg:z-10 lg:mb-0">
          <Reveal>
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/70">The mall directory</p>
            <h1 className="mt-3 font-heading text-5xl leading-[1.02] text-brand-dark sm:text-6xl">
              Explore.<br />Discover.<br /><span className="accent-word not-italic">Celebrate.</span>
            </h1>
            <span className="mt-5 block h-0.5 w-12 rounded-full bg-brand-secondary" aria-hidden="true" />
            <p className="mt-5 max-w-xs text-base leading-relaxed text-brand-dark/70">Your premium gifting mall, with boutiques, experiences and memories waiting to be discovered.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href="/vendors">View All Boutiques <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button variant="outline" asChild><Link href="/about"><Play className="h-4 w-4" /> How it works</Link></Button>
            </div>
          </Reveal>
        </div>
        <MallDirectory image={image} previews={previews} />
        <Reveal className="mt-10 hidden items-end gap-3 lg:absolute lg:bottom-8 lg:left-8 lg:mt-0 lg:flex">
          <Robin className="float-slow w-20" />
          <div className="mb-2 max-w-[13rem] rounded-card border border-brand-dark/[0.06] bg-brand-surface p-3 text-sm shadow-card">
            <p className="font-medium text-brand-dark">Hi there! 👋</p>
            <p className="mt-0.5 text-xs text-brand-dark/65">Not sure where to start? Try Birthday World — it&apos;s our most loved.</p>
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading eyebrow="Featured destinations" title="Handpicked Experiences For You" subtitle="Step into our most loved spaces and uncover something truly special." />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((z, i) => (
            <Reveal key={z.id} delay={i * 90}>
              <Link href={z.href} className="group relative block overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-primary p-6 pb-7 text-brand-on-primary shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                {zoneArt(z.id, z.href, themeId) ? (
                  <>
                    <Image src={zoneArt(z.id, z.href, themeId)!.src} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                    <span className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/90 via-brand-primary-dark/45 to-brand-primary-dark/10" aria-hidden="true" />
                  </>
                ) : (
                  <Jaali className="opacity-[0.1]" />
                )}
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary font-heading text-lg text-brand-on-secondary">{z.n}</span>
                <h3 className="relative mt-16 font-heading text-2xl">{z.title}</h3>
                <p className="relative mt-1 text-sm text-brand-on-primary/70">{z.sub}</p>
                <p className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary">Explore Now <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" /></p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
