import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";
import type { ProcessedImage } from "@/lib/storage/resize";

export const PRODUCT_IMAGE_BUCKET = "product-images";

export interface StoredImage {
  storagePath: string; // the full-size object; the other sizes are siblings (see below)
  url: string;
  mediumUrl: string;
  thumbUrl: string;
}

/**
 * Writes with the service-role client on purpose — the bucket has no client-side write policies, so
 * the only bytes that can ever land in it are ones this server re-encoded itself. Callers must have
 * already authenticated the user and verified they own the product.
 */
export async function storeProductImage(
  vendorId: string,
  productId: string,
  image: ProcessedImage,
): Promise<StoredImage> {
  const storage = createAdminClient().storage.from(PRODUCT_IMAGE_BUCKET);
  const stem = `${vendorId}/${productId}/${randomUUID()}`;
  const uploads = [
    { path: `${stem}-full.webp`, body: image.full },
    { path: `${stem}-medium.webp`, body: image.medium },
    { path: `${stem}-thumb.webp`, body: image.thumb },
  ];

  for (const upload of uploads) {
    const { error } = await storage.upload(upload.path, upload.body, {
      contentType: "image/webp",
      cacheControl: "31536000", // content-addressed by random uuid, so safe to cache "forever"
      upsert: false,
    });
    if (error) {
      await storage.remove(uploads.map((u) => u.path));
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }

  const publicUrl = (path: string) => storage.getPublicUrl(path).data.publicUrl;
  return {
    storagePath: uploads[0].path,
    url: publicUrl(uploads[0].path),
    mediumUrl: publicUrl(uploads[1].path),
    thumbUrl: publicUrl(uploads[2].path),
  };
}

/** `storagePath` is the -full object; remove all three sibling renditions. */
export async function removeProductImageFiles(storagePath: string) {
  const stem = storagePath.replace(/-full\.webp$/, "");
  await createAdminClient()
    .storage.from(PRODUCT_IMAGE_BUCKET)
    .remove([`${stem}-full.webp`, `${stem}-medium.webp`, `${stem}-thumb.webp`]);
}
