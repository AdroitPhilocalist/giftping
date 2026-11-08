import { IntentLink } from "@/components/shop/ShopNavigation";
import { cn } from "@/lib/utils/cn";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 ? (
        <IntentLink
          href={buildHref(page - 1)}
          rel="nofollow"
          className="rounded-full px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-dark/5"
        >
          Prev
        </IntentLink>
      ) : null}

      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 ? <span className="px-1 text-brand-dark/30">…</span> : null}
          <IntentLink
            href={buildHref(p)}
            rel="nofollow"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-sm",
              p === page
                ? "bg-brand-primary text-brand-light"
                : "text-brand-dark/70 hover:bg-brand-dark/5",
            )}
          >
            {p}
          </IntentLink>
        </span>
      ))}

      {page < totalPages ? (
        <IntentLink
          href={buildHref(page + 1)}
          rel="nofollow"
          className="rounded-full px-3 py-2 text-sm text-brand-dark/70 hover:bg-brand-dark/5"
        >
          Next
        </IntentLink>
      ) : null}
    </nav>
  );
}
