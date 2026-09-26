import Link from "next/link";
import { Robin } from "@/components/art/Robin";
import type { IdeaCardData } from "@/lib/diary/ui-types";
import { IdeaCard } from "../GiftIdeas";
import { MemoNote } from "../MemoNote";
import { PageHeading } from "./PageBits";
import { tiltFor } from "@/lib/diary/present";

/** Four gift ideas for one moment, big enough to look at properly. `who` is the noun after "for" ("Mom's birthday"). */
export function IdeasPage({ who, ideas, moreHref, sub }: { who: string; ideas: IdeaCardData[]; moreHref: string; sub?: string }) {
  return (
    <div className="flex h-full flex-col">
      <PageHeading sub={sub ?? "Picked from what you've told the diary about them"} action={<Link href={moreHref} className="dy-link">Open their page →</Link>}>Ideas for {who}</PageHeading>
      <ul className="dy-ideas mt-5 grid grid-cols-2 gap-x-5 gap-y-6">
        {ideas.slice(0, 4).map((idea, i) => (
          <li key={idea.productId} className="dy-in" style={{ ["--in-delay" as string]: `${120 + i * 90}ms` }}>
            <IdeaCard idea={idea} tilt={tiltFor(i + 1, 1.7)} tape={i % 2 ? "sage" : "blush"} reasonLine />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** When there is no second moment to plan for. */
export function IdeasRestPage({ title, line }: { title?: string; line?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="w-32"><Robin pose="peeking" title="" /></div>
      {title ? <p className="dy-hand-b text-[1.9rem] leading-[1.05]">{title}</p> : null}
      <MemoNote tone="peach" tilt={-1.5}>{line ?? "Add another date and the diary will line up ideas for that too"}</MemoNote>
      <Link href="/categories" className="dy-btn dy-btn--sprig">Wander the mall <span aria-hidden="true">→</span></Link>
    </div>
  );
}
