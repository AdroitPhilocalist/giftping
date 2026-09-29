"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { prepareForUpload } from "@/lib/client/prepare-image";

/** Saves immediately on pick — same pattern as VendorBrandingForm's logo slot, not part of the name/phone form below it. */
export function AvatarUpload({ url }: { url: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", await prepareForUpload(file), file.name);
      const response = await fetch("/api/account/upload-avatar", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) return setError(json.error ?? "Upload failed.");
      toast.success("Profile photo updated.");
      router.refresh();
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={uploading}
        aria-label={url ? "Change profile photo" : "Add a profile photo"}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-brand-dark/25 bg-brand-accent/40 text-brand-dark/50 hover:bg-brand-accent"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a settings-page preview of the saved file
          <img src={url} alt="Your profile photo" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
        )}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <div>
        <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? "Uploading…" : url ? "Change photo" : "Add a photo"}
        </Button>
        <p className="mt-1.5 text-xs text-brand-dark/50">JPEG, PNG, or WebP, up to 4MB.</p>
        {error ? <p role="alert" className="mt-1 text-xs text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
