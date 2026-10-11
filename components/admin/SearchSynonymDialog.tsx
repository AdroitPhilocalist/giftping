"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { saveSearchSynonymAction } from "@/lib/admin/search-synonym-actions";
import { parseSynonymWords, searchSynonymSchema } from "@/lib/validation/search-synonym.schema";

export interface SearchSynonymFormValues {
  id?: string;
  term: string;
  /** comma-separated for the textbox — parsed with parseSynonymWords() before validating/saving */
  synonymsText: string;
}

export const EMPTY_SEARCH_SYNONYM: SearchSynonymFormValues = { term: "", synonymsText: "" };

export function SearchSynonymDialog({ initial }: { initial?: SearchSynonymFormValues }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SearchSynonymFormValues>(initial ?? EMPTY_SEARCH_SYNONYM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { term: form.term, synonyms: parseSynonymWords(form.synonymsText) };
    const parsed = searchSynonymSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveSearchSynonymAction(parsed.data, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Synonym group saved." : "Synonym group created.");
      setOpen(false);
      if (!editing) setForm(EMPTY_SEARCH_SYNONYM);
      router.refresh();
    });
  }

  return (
    <>
      {editing ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-brand-primary underline">Edit</button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New synonym group</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? `Edit "${initial?.term}"` : "New synonym group"} className="max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <div>
            <Label htmlFor="syn-term">Term</Label>
            <Input id="syn-term" value={form.term} onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))} maxLength={30} placeholder="candle" autoFocus />
            <p className="mt-1 text-xs text-brand-dark/50">One word a shopper might search. Letters and numbers only, no spaces.</p>
          </div>
          <div>
            <Label htmlFor="syn-synonyms">Means the same as</Label>
            <Input id="syn-synonyms" value={form.synonymsText} onChange={(e) => setForm((f) => ({ ...f, synonymsText: e.target.value }))} placeholder="scent, fragrance" />
            <p className="mt-1 text-xs text-brand-dark/50">
              Comma-separated. Searching any of these words now also finds products matching the others — it works both ways, so you only need one row per group.
            </p>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
