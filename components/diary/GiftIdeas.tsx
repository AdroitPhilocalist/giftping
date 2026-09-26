import Link from "next/link";
import { Gift } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductImage";
import { DiaryHeart } from "./DiaryHeart";
import { SectionTitle } from "./book/SectionTitle";
import { tiltFor } from "@/lib/diary/present";
import type { IdeaCardData } from "@/lib/diary/ui-types";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** One gift idea, as a polaroid pinned with tape: the whole card links to the product, the heart saves it to the wishlist. */
export function IdeaCard({ idea, tilt = 0, tape = "blush", reasonLine = false, action }: { idea: IdeaCardData; tilt?: number; tape?: "blush" | "sage" | "mustard" | "sky"; reasonLine?: boolean; action?: React.ReactNode }) {
  return (
    <figure className="dy-polaroid dy-polaroid--hover relative [--photo-ratio:4/3] xl:[--photo-ratio:16/10]" style={{ ["--tilt" as string]: `${tilt}deg` }}>
      <span className={`dy-tape dy-tape--${tape}`} style={{ top: "-0.7rem", left: "50%", marginLeft: "-2.4rem", ["--tape-rot" as string]: `${tilt > 0 ? -5 : 4}deg` }} aria-hidden="true" />
      <div className="dy-polaroid-photo">
        <ProductImage src={idea.thumbnail} alt="" className="absolute inset-0 h-full w-full" sizes="(min-width: 1024px) 200px, 45vw" />
        <DiaryHeart productId={idea.productId} initial={idea.wished ?? false} className="!absolute right-1.5 top-1.5 z-[3]" />
      </div>
      <figcaption className="dy-polaroid-cap !text-left">
        <Link href={`/products/${idea.slug}`} className="dy-stretch dy-hand-b block truncate text-[1.25rem] leading-[1.1] hover:text-[var(--gp-copper)]">{idea.name}</Link>
        <span className="dy-ui mt-0.5 block text-[0.95rem] font-semibold text-[var(--dy-ink)]">{formatCurrency(idea.price)}</span>
        {reasonLine && idea.reason ? <span className="dy-cap mt-0.5 block leading-[1.15]">{idea.reason}</span> : null}
        {action ? <span className="mt-1 block">{action}</span> : null}
      </figcaption>
    </figure>
  );
}

/** "Gift ideas for Mom's birthday": three polaroids. `who` reads as the section's noun ("Mom's birthday"). */
export function GiftIdeas({ ideas, who, moreHref, className, id = "ideas-h", reasonLine = false, cols = 3, renderAction }: { ideas: IdeaCardData[]; who: string; moreHref?: string; className?: string; id?: string; reasonLine?: boolean; cols?: 3 | 2; renderAction?: (idea: IdeaCardData) => React.ReactNode }) {
  if (ideas.length === 0) return null;
  return (
    <section aria-labelledby={id} className={className}>
      <SectionTitle id={id} icon={<Gift />} action={moreHref ? <Link href={moreHref} className="dy-link">See more →</Link> : null}>Gift ideas for {who}</SectionTitle>
      <ul className={cn("mt-5 xl:mt-3 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:overflow-visible sm:pb-0 sm:pt-0", cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {ideas.slice(0, cols === 3 ? 6 : 4).map((idea, i) => (
          <li key={idea.productId} className="dy-in w-[62%] shrink-0 snap-start sm:w-auto" style={{ ["--in-delay" as string]: `${200 + i * 100}ms` }}>
            <IdeaCard idea={idea} tilt={tiltFor(i + 2, 1.7)} tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "sage" : "mustard"} reasonLine={reasonLine} action={renderAction?.(idea)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
