import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { siteImage } from "@/lib/content/imagery";
import { RELATIONSHIPS } from "@/lib/relationships";
import { getActiveTheme } from "@/lib/theme/active";

/** "Shop by relationship": five warm portraits, each leading to the gifts for that person. Falls back to a tinted tile until a portrait exists. */
export async function RelationshipCards() {
  const theme = await getActiveTheme();
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="Made for someone" title="Shop by relationship" subtitle="Start with who it's for — we'll show you what they'd love." />
      </Reveal>
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
        {RELATIONSHIPS.map((r, i) => {
          const img = siteImage(r.imageKey, theme.id);
          return (
            <li key={r.slug} className={i === RELATIONSHIPS.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
              <Reveal delay={i * 80}>
                <Link href={`/gifts-for/${r.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-card bg-brand-accent shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift">
                  {img ? (
                    <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-accent to-brand-surface text-brand-secondary"><Heart className="h-10 w-10" aria-hidden="true" /></span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-primary-dark/90 via-brand-primary-dark/40 to-transparent px-4 pb-4 pt-16">
                    <span className="block font-heading text-lg text-white">{r.title}</span> {/* theme-safe: text on a photo scrim, must stay light in every theme */}
                    <span className="mt-0.5 block text-xs text-white/80">{r.line}</span> {/* theme-safe: text on a photo scrim */}
                  </span>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
