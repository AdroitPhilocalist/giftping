import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Vendor logo + banner storage. Files live under `<vendorId>/` in the public `vendor-branding` bucket; every upload gets a fresh random name (so browsers
 * can cache them "forever" and a replacement is never served stale), and the previous files are deleted when a new one is saved. The bucket has no client
 * write policies — only these functions, running server-side after the caller has been proven to own the boutique, ever write to it.
 */
export const BRANDING_BUCKET = "vendor-branding";
export type BrandingKind = "logo" | "banner";

const bucket = () => createAdminClient().storage.from(BRANDING_BUCKET);

export async function storeVendorLogo(vendorId: string, logo: Buffer): Promise<{ path: string; url: string }> {
  const path = `${vendorId}/logo-${randomUUID()}.webp`;
  const { error } = await bucket().upload(path, logo, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path, url: bucket().getPublicUrl(path).data.publicUrl };
}

export async function storeVendorBanner(vendorId: string, image: { full: Buffer; medium: Buffer }): Promise<{ path: string; url: string }> {
  const stem = `${vendorId}/banner-${randomUUID()}`;
  const uploads = [
    { path: `${stem}-full.webp`, body: image.full },
    { path: `${stem}-medium.webp`, body: image.medium },
  ];
  for (const upload of uploads) {
    const { error } = await bucket().upload(upload.path, upload.body, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) {
      await bucket().remove(uploads.map((u) => u.path));
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }
  return { path: uploads[0].path, url: bucket().getPublicUrl(uploads[0].path).data.publicUrl };
}

/** The storage path of a stored public URL, or null if it isn't one of ours (the DB constraint means it always is). */
export function brandingPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BRANDING_BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : url.slice(at + marker.length);
}

/** Removes a stored logo/banner (a banner has a -medium sibling). Best effort: a leftover file is harmless, a failed cleanup must not fail the request. */
export async function removeBrandingFiles(url: string | null) {
  const path = brandingPathFromUrl(url);
  if (!path) return;
  const paths = path.endsWith("-full.webp") ? [path, path.replace(/-full\.webp$/, "-medium.webp")] : [path];
  await bucket().remove(paths);
}

export const bannerMediumUrl = (url: string) => url.replace(/-full\.webp$/, "-medium.webp");
