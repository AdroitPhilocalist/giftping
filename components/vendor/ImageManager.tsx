"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { deleteProductImageAction, setPrimaryImageAction } from "@/lib/vendor/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { prepareForUpload } from "@/lib/client/prepare-image";

export interface ManagedImage {
  id: string;
  thumb_url: string | null;
  medium_url: string | null;
  url: string;
  is_primary: boolean;
}

export function ImageManager({ productId, images }: { productId: string; images: ManagedImage[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      try {
        const body = new FormData();
        body.set("productId", productId);
        body.set("file", await prepareForUpload(file), file.name);
        const response = await fetch("/api/vendor/upload-image", { method: "POST", body });
        const json = (await response.json()) as { error?: string };
        if (!response.ok) {
          toast(`${file.name}: ${json.error ?? "upload failed"}`);
        } else {
          uploaded += 1;
        }
      } catch {
        toast(`${file.name}: upload failed`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded > 0) {
      toast(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded`);
      router.refresh();
    }
  }

  function run(action: () => Promise<{ error?: string }>, done: string) {
    startTransition(async () => {
      const result = await action();
      toast(result.error ?? done);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg text-brand-dark">Photos</h2>
          <p className="text-xs text-brand-dark/50">JPEG, PNG or WebP · at least 400px · up to 8 photos. The first is your main photo.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          {uploading ? "Uploading…" : "Add photos"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {images.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-brand-dark/15 p-8 text-center text-sm text-brand-dark/50">
          No photos yet — products with photos get approved and sell faster.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <li key={image.id} className="group relative aspect-square overflow-hidden rounded-xl bg-brand-accent/40">
              <Image src={image.thumb_url ?? image.url} alt="" fill sizes="200px" className="object-cover" />
              {image.is_primary ? (
                <span className="absolute left-2 top-2 rounded-full bg-brand-secondary px-2 py-0.5 text-[10px] font-semibold text-brand-dark">
                  Main
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                {!image.is_primary ? (
                  <button
                    type="button"
                    disabled={isPending}
                    aria-label="Make main photo"
                    onClick={() => run(() => setPrimaryImageAction(image.id), "Main photo updated")}
                    className="rounded-full bg-brand-surface/90 p-1.5 text-brand-dark"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={isPending}
                  aria-label="Remove photo"
                  onClick={() => run(() => deleteProductImageAction(image.id), "Photo removed")}
                  className="rounded-full bg-brand-surface/90 p-1.5 text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
