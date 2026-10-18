import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { siteImage } from "@/lib/content/imagery";
import { RELATIONSHIPS } from "@/lib/relationships";
import { getActiveTheme } from "@/lib/theme/active";

/**
 * "Shop by relationship": five warm portraits, each leading to the gifts for that person.
 *
 * These are the site's FOURTH card idiom — an "alcove" (styles in `globals.css` under `.gp-alcove`): a dome-topped arched niche, gilded, holding the
 * person in shadow until you arrive, when the niche lights from within. It is deliberately nothing like the other three: not a lit-glass object that
 * leans toward you (`GlowCard`), not a window whose world moves (`WorldCard`), not a framed print that grows in its mount (`DiscoverCards`) — a place
 * of honour, and the only card whose motion is TIME-driven rather than pointer-driven. Falls back to a votive tile until a portrait exists.
 */
export async function RelationshipCards() {
  const theme = await getActiveTheme();
  return (
    <section className="gp-alcove-row mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Reveal>
        <SectionHeading eyebrow="Made for someone" title="Shop by relationship" subtitle="Start with who it's for — we'll show you what they'd love." />
      </Reveal>
      <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-5">
        {RELATIONSHIPS.map((r, i) => {
          const img = siteImage(r.imageKey, theme.id);
          return (
            <li key={r.slug} className={i === RELATIONSHIPS.length - 1 ? "col-span-2 sm:col-span-1" : undefined}>
              <Reveal className="h-full" delay={i * 80}>
                <Link href={`/gifts-for/${r.slug}`} className="gp-alcove group flex h-full flex-col">
                  <span className="gp-alcove-stage relative aspect-[4/5] w-full shrink-0">
                    <span className="gp-alcove-halo" aria-hidden="true" />
                    <span className="gp-alcove-arch">
                      {img ? (
                        <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 20vw, 50vw" className="gp-alcove-portrait object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-brand-accent to-brand-primary-dark">
                          <Heart className="gp-alcove-portrait h-9 w-9 text-brand-on-primary" aria-hidden="true" />
                        </span>
                      )}
                      <span className="gp-alcove-veil" aria-hidden="true" />
                      <span className="gp-alcove-light" aria-hidden="true" />
                      <span className="gp-alcove-tracery" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="gp-alcove-plaque">
                    <span className="gp-alcove-name">{r.title}</span>
                    <span className="gp-alcove-line">{r.line}</span>
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
