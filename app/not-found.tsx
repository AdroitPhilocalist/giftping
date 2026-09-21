import Link from "next/link";
import { Robin } from "@/components/art/Robin";
import { Button } from "@/components/ui/Button";

export const metadata = { title: "Page not found — GiftPing" };

/** The mall's "wrong door" page: a peeking robin and three ways back in. */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <Robin pose="peeking" priority className="w-44" title="The GiftPing robin, peeking around a corner" />
      <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.3em] text-brand-secondary-dark">Error 404</p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark">This door leads <span className="accent-word">nowhere</span></h1>
      <p className="mt-3 text-brand-dark/65">The page you were looking for isn&apos;t in the mall — it may have moved, or the link might be a little off.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button size="lg" asChild><Link href="/">Back to the entrance</Link></Button>
        <Button size="lg" variant="outline" asChild><Link href="/mall">Open the mall map</Link></Button>
      </div>
    </div>
  );
}
