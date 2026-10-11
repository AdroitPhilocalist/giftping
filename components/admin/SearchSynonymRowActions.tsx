"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { deleteSearchSynonymAction } from "@/lib/admin/search-synonym-actions";

export function SearchSynonymRowActions({ id, term }: { id: string; term: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      const r = await deleteSearchSynonymAction(id);
      if (r.error) toast.error(r.error);
      else {
        toast.success("Synonym group deleted.");
        router.refresh();
      }
    });
  return (
    <button type="button" disabled={pending} onClick={() => confirm(`Delete the synonym group for "${term}"?`) && run()} className="text-xs text-brand-dark/50 hover:text-red-700">
      Delete
    </button>
  );
}
