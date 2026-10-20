"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StarRatingInput } from "@/components/shop/StarRatingInput";
import { toast } from "@/components/ui/Toast";
import { deleteReviewAction, editReviewAction, submitReviewAction } from "@/lib/shop/review-actions";
import type { ReviewActionResult } from "@/lib/shop/review-actions";
import type { ReviewSummary } from "@/lib/db/reviews";

interface Draft { rating: number; title: string; body: string }

function ReviewFields({ draft, onChange, error }: { draft: Draft; onChange: (next: Draft) => void; error: string | null }) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Rating</Label>
        <StarRatingInput value={draft.rating} onChange={(rating) => onChange({ ...draft, rating })} />
      </div>
      <div>
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input id="review-title" maxLength={120} value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} placeholder="Sum it up in a few words" />
      </div>
      <div>
        <Label htmlFor="review-body">Your review</Label>
        <Textarea id="review-body" maxLength={2000} value={draft.body} onChange={(e) => onChange({ ...draft, body: e.target.value })} placeholder="What did you think?" />
      </div>
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

/** On a delivered order item that has no review yet ("Write a review"), or already does ("Edit your review" —
 * submitting again upserts the same row, so this one dialog covers both without needing to know which case it is).
 * When a review already exists, start from its values so editing never opens a blank form. */
export function WriteReviewButton({ productId, orderItemId, productName, existingReview }: { productId: string; orderItemId: string; productName: string; existingReview: ReviewSummary | null }) {
  const router = useRouter();
  const hasReview = existingReview !== null;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    rating: existingReview?.rating ?? 5,
    title: existingReview?.title ?? "",
    body: existingReview?.body ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (draft.body.trim().length < 10) return setError("Say a little more — at least 10 characters.");
    startTransition(async () => {
      const result: ReviewActionResult = await submitReviewAction(productId, orderItemId, { rating: draft.rating, title: draft.title, body: draft.body });
      if (result.error) return setError(result.error);
      toast.success("Thanks for your review!");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
        {hasReview ? "Edit your review" : "Write a review"}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={hasReview ? `Edit your review — ${productName}` : `Review ${productName}`}>
        <ReviewFields draft={draft} onChange={setDraft} error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Submit review"}</Button>
        </div>
      </Modal>
    </>
  );
}

/** From /account/reviews: edit or delete a review already written. */
export function EditReviewButton({ reviewId, productName, rating, title, body }: { reviewId: string; productName: string; rating: number; title: string | null; body: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ rating, title: title ?? "", body });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (draft.body.trim().length < 10) return setError("Say a little more — at least 10 characters.");
    startTransition(async () => {
      const result = await editReviewAction(reviewId, { rating: draft.rating, title: draft.title, body: draft.body });
      if (result.error) return setError(result.error);
      toast.success("Your review is updated.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Edit</Button>
      <Modal open={open} onOpenChange={setOpen} title={`Edit your review — ${productName}`}>
        <ReviewFields draft={draft} onChange={setDraft} error={error} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        </div>
      </Modal>
    </>
  );
}

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-brand-dark/50 underline hover:text-red-700 disabled:opacity-50"
      onClick={() => {
        if (!confirm("Delete this review? This can't be undone.")) return;
        startTransition(async () => {
          const result = await deleteReviewAction(reviewId);
          if (result.error) { toast.error(result.error); return; }
          toast.success("Review deleted.");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
