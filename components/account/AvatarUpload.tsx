"use client";

import { useRef, useState } from "react";
import { User as UserIcon, ZoomIn, Download, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { prepareForUpload } from "@/lib/client/prepare-image";

/** Saves immediately on pick — same pattern as VendorBrandingForm's logo slot, not part of the name/phone form below it. */
export function AvatarUpload({ url }: { url: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Local mirror of the avatar URL so the UI updates instantly after upload
  // without waiting for a full server re-render (router.refresh).
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", await prepareForUpload(file), file.name);
      const response = await fetch("/api/account/upload-avatar", { method: "POST", body });
      const json = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!response.ok) return setError(json.error ?? "Upload failed.");
      toast.success("Profile photo updated.");
      setAvatarUrl(json.url ?? null);
    } catch {
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar area: when a photo exists it opens an enlargement preview on click — it never opens the file picker.
          The file picker is triggered only by the "Change photo" button below. */}
      <div className="relative h-20 w-20 shrink-0">
        {avatarUrl ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setPreviewOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setPreviewOpen(true)}
            aria-label="Enlarge profile photo"
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-brand-dark/10 hover:border-brand-secondary cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a settings-page preview of the saved file */}
            <img src={avatarUrl} alt="Your profile photo" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-5 w-5 text-brand-light" aria-hidden="true" />
            </span>

            {/* Simple photo preview modal */}
            {previewOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
                {/* Backdrop click closes */}
                <div className="absolute inset-0" />

                {/* Modal content — clicks inside don't close */}
                <div className="relative z-10 flex flex-col items-center justify-center max-w-[90vw] max-h-[90vh] p-6" onClick={(e) => e.stopPropagation()}>
                  {/* Close button — top right, just outside the image */}
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(false)}
                    aria-label="Close preview"
                    className="absolute -top-8 -right-8 z-20 rounded-full p-2 bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg"
                  >
                    <X className="h-6 w-6" />
                  </button>

                  {/* Centered image */}
                  <div className="flex items-center justify-center max-w-[80vw] max-h-[70vh]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- full-size preview of the saved file */}
                    <img
                      src={avatarUrl}
                      alt="Your profile photo"
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl bg-brand-surface/5"
                    />
                  </div>

                  {/* Download link */}
                  <a
                    href={avatarUrl}
                    download="profile-photo.webp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 bg-brand-surface/20 hover:bg-brand-surface/30 text-brand-dark text-sm transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download photo
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={uploading}
            aria-label="Add a profile photo"
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-brand-dark/25 bg-brand-accent/40 text-brand-dark/50 hover:bg-brand-accent"
          >
            <UserIcon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      <div>
        <Button type="button" size="sm" variant="secondary" disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Add a photo"}
        </Button>
        <p className="mt-1.5 text-xs text-brand-dark/50">JPEG, PNG, or WebP, up to 4MB.</p>
        {error ? <p role="alert" className="mt-1 text-xs text-red-700">{error}</p> : null}
      </div>
    </div>
  );
}
