import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** The section opener used across the mall: a tiny tracked eyebrow with a heart, a serif title, one calm line. */
export function SectionHeading({ eyebrow, title, subtitle, align = "center", className }: { eyebrow: string; title: React.ReactNode; subtitle?: string; align?: "center" | "left"; className?: string }) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/70 [&>svg]:text-brand-secondary" style={{ justifyContent: align === "center" ? "center" : "flex-start" }}>
        {eyebrow} <Heart className="h-3 w-3 fill-current" aria-hidden="true" />
      </p>
      <h2 className="mt-2 font-heading text-3xl leading-tight text-brand-dark sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm leading-relaxed text-brand-dark/65 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
