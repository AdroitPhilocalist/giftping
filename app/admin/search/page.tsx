import { SearchSynonymDialog, type SearchSynonymFormValues } from "@/components/admin/SearchSynonymDialog";
import { SearchSynonymRowActions } from "@/components/admin/SearchSynonymRowActions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Search — GiftPing Admin" };

export default async function AdminSearchPage() {
  await requireRole("admin");
  const { data: groups } = await (await createClient()).from("search_synonyms").select("*").order("term");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Search synonyms</h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            Words that mean the same thing for search. A shopper who searches any word in a group finds products matching any other word in it too — so a product
            tagged &ldquo;home fragrance&rdquo; can still be found by someone who searches &ldquo;scent&rdquo;.
          </p>
        </div>
        <SearchSynonymDialog />
      </div>

      {!groups || groups.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No synonym groups yet. Add one — try &ldquo;sweets&rdquo; meaning &ldquo;mithai, chocolates&rdquo;.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
          {groups.map((g) => {
            const form: SearchSynonymFormValues = { id: g.id, term: g.term, synonymsText: g.synonyms.join(", ") };
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-sm text-brand-dark">
                  <span className="font-medium">{g.term}</span>
                  <span className="text-brand-dark/50"> means the same as </span>
                  <span className="font-medium">{g.synonyms.join(", ")}</span>
                </p>
                <div className="flex items-center gap-4">
                  <SearchSynonymDialog initial={form} />
                  <SearchSynonymRowActions id={g.id} term={g.term} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
