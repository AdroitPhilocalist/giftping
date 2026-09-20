"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { prepareForUpload } from "@/lib/client/prepare-image";
import { removeMyBrandingAction } from "@/lib/vendor/branding-actions";
import { cn } from "@/lib/utils/cn";

type Kind = "logo" | "banner";

const COPY: Record<Kind, { title: string; hint: string; empty: string }> = {
  logo: { title: "Logo", hint: "Shown in a circle next to your boutique name. Square works best — 512×512, JPEG/PNG/WebP up to 4MB. Off-centre parts are cropped.", empty: "Add a logo" },
  banner: { title: "Storefront banner", hint: "A wide picture across the top of your boutique page — about 16:5 (1600×500 is ideal), up to 4MB. Keep faces and text away from the far edges.", empty: "Add a banner" },
};

function BrandingSlot({ kind, url }: { kind: Kind; url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = COPY[kind];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", await prepareForUpload(file), file.name);
      const response = await fetch("/api/vendor/upload-branding", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return setError(json.error ?? "Upload failed.");
      toast.success(`${copy.title} updated.`);
      router.refresh();
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-brand-dark">{copy.title}</h3>
      <p className="mt-0.5 text-xs text-brand-dark/50">{copy.hint}</p>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        aria-label={url ? `Change ${copy.title.toLowerCase()}` : copy.empty}
        className={cn(
          "mt-3 flex items-center justify-center overflow-hidden border border-dashed border-brand-dark/25 bg-brand-accent/40 text-sm text-brand-dark/60 hover:bg-brand-accent",
          kind === "logo" ? "h-28 w-28 rounded-full" : "aspect-[16/5] w-full rounded-xl",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a settings-page preview of the saved file
          <img src={url} alt={`Your current ${copy.title.toLowerCase()}`} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-2 text-center text-xs"><ImagePlus className="h-5 w-5" />{uploading ? "Uploading…" : copy.empty}</span>
        )}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="mt-2 flex items-center gap-3 text-xs">
        <Button type="button" size="sm" variant="secondary" disabled={uploading || pending} onClick={() => input.current?.click()}>{uploading ? "Uploading…" : url ? "Replace" : "Upload"}</Button>
        {url ? (
          <button
            type="button"
            disabled={uploading || pending}
            className="text-brand-dark/60 hover:text-red-700 disabled:opacity-50"
            onClick={() =>
              startTransition(async () => {
                const result = await removeMyBrandingAction(kind);
                if (result.error) toast.error(result.error);
                else {
                  toast.success(`${copy.title} removed.`);
                  router.refresh();
                }
              })
            }
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

/** Uploads save immediately (they're not part of the settings form below): pick a file and the storefront updates. */
export function VendorBrandingForm({ logoUrl, bannerUrl }: { logoUrl: string | null; bannerUrl: string | null }) {
  return (
    <section aria-labelledby="branding-heading" className="mb-6 space-y-6 rounded-2xl border border-brand-dark/10 bg-white p-5">
      <h2 id="branding-heading" className="font-heading text-lg text-brand-dark">Your boutique&apos;s look</h2>
      <BrandingSlot kind="logo" url={logoUrl} />
      <BrandingSlot kind="banner" url={bannerUrl} />
    </section>
  );
}
