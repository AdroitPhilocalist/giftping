import { Jaali } from "@/components/ornaments/Jaali";
import { cn } from "@/lib/utils/cn";

/** The opening band shared by the content pages: tracked eyebrow, serif title, one calm line, on the warm mall backdrop. */
export function PageHero({ eyebrow, title, subtitle, children, className }: { eyebrow: string; title: React.ReactNode; subtitle?: string; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden border-b border-brand-dark/[0.06] bg-gradient-to-b from-brand-accent to-brand-light", className)}>
      <Jaali className="opacity-[0.07]" />
      <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-brand-secondary-dark">{eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-brand-dark/70 sm:text-lg">{subtitle}</p> : null}
        {children ? <div className="mt-7">{children}</div> : null}
      </div>
    </section>
  );
}
