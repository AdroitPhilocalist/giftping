"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/** Downloads a JSON copy of the signed-in person's data. Uses fetch (not a plain link) so a throttle or error is shown as a message instead of replacing the page. */
export function DataExportSection() {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const response = await fetch("/api/account/export", { method: "POST" });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "We couldn't prepare your data. Please try again.");
        return;
      }
      const blob = await response.blob();
      const name = /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? "giftping-my-data.json";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    } catch {
      toast.error("Download failed — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-brand-dark/10 bg-white p-5">
      <h2 className="font-heading text-lg text-brand-dark">Download my data</h2>
      <p className="mt-1 text-sm text-brand-dark/70">
        Get a copy of the personal data we hold about you — your details, addresses, orders and payments, wishlist, reviews, gifting diary and notifications — as a file you can keep.
        We don&apos;t include our internal accounting or other people&apos;s information. We&apos;ll also email you a note that a copy was downloaded.
      </p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={download} disabled={busy}>
        <Download className="h-4 w-4" /> {busy ? "Preparing…" : "Download my data"}
      </Button>
    </section>
  );
}
