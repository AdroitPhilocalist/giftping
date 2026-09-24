"use client";

import { Share2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

/**
 * "Share my year": hands the numbers — and only the numbers — to the phone's share sheet (or copies them). No names, no photos, no dates: the diary is private,
 * and what leaves it is a sentence the person can read before it goes.
 */
export function ShareYearButton({ text, title }: { text: string; title: string }) {
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${window.location.origin}`);
      toast.success("Copied — paste it anywhere.");
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return; // they closed the share sheet
      toast.error("Couldn't share right now.");
    }
  }
  return (
    <button type="button" onClick={share} className="dy-btn dy-btn--lg dy-btn--sprig"><Share2 className="h-5 w-5" aria-hidden="true" /> Share my year <span aria-hidden="true">→</span></button>
  );
}
