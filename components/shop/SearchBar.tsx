import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function SearchBar({
  defaultValue,
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action="/search" method="get" className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/40" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search for gifts, occasions, people..."
        className="w-full rounded-button border border-brand-dark/10 bg-brand-light/70 py-3.5 pl-11 pr-4 text-sm text-brand-dark placeholder:text-brand-dark/45 transition-colors focus:border-brand-secondary focus:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
      />
    </form>
  );
}
