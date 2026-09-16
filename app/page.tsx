import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-medium uppercase tracking-widest text-brand-secondary-dark">
        Welcome to GiftPing Mall
      </p>
      <h1 className="mt-4 font-heading text-4xl text-brand-dark sm:text-5xl">
        Where Every Gift Story <span className="text-brand-secondary-dark">Comes Alive</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-brand-dark/60">
        The full mall experience is being built stage by stage. This is the Stage 0 foundation —
        design system, layout shell, and component library — ready for the catalog, diary, and
        checkout to be wired in next.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/kitchen-sink">Component Library</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/diary">Gifting Diary</Link>
        </Button>
      </div>

      <Card className="mx-auto mt-16 max-w-md text-left">
        <h2 className="font-heading text-lg text-brand-dark">Build status</h2>
        <p className="mt-2 text-sm text-brand-dark/60">
          See <code className="rounded bg-brand-dark/5 px-1.5 py-0.5">PROGRESS.md</code> in the
          repo root for exactly what stage this is and what&apos;s next.
        </p>
      </Card>
    </div>
  );
}
