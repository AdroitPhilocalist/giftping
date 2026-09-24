import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";

/**
 * Photos of the people in a diary. The `diary-photos` bucket is PRIVATE and has no client policies at all: only these functions — running on the server
 * after the caller has been proven to own the person — ever write to it, and the only way a browser sees a photo is a signed URL minted here that expires
 * in an hour. Files live under `<owner id>/<person id>-<random>.webp`; diary_contacts.photo_url is CHECK-pinned to exactly that shape.
 */
export const DIARY_PHOTO_BUCKET = "diary-photos";
export const SIGNED_URL_SECONDS = 60 * 60;

const bucket = () => createAdminClient().storage.from(DIARY_PHOTO_BUCKET);

/** A fresh name per upload, so a replaced photo is never served stale and the old file can be deleted safely. */
export const newDiaryPhotoPath = (userId: string, contactId: string) => `${userId}/${contactId}-${randomUUID()}.webp`;

export async function storeDiaryPhoto(userId: string, contactId: string, image: Buffer): Promise<{ path: string }> {
  const path = newDiaryPhotoPath(userId, contactId);
  const { error } = await bucket().upload(path, image, { contentType: "image/webp", cacheControl: "3600", upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path };
}

/** Best effort: a leftover file is harmless (nothing references it), a failed cleanup must never fail the request. */
export async function removeDiaryPhoto(path: string | null | undefined) {
  if (!path) return;
  const { error } = await bucket().remove([path]);
  if (error) console.error("[diary-photos] remove failed", error.message);
}

/** Every photo a person ever added — used when an account is erased (DPDP). Lists the owner's folder page by page. */
export async function removeAllDiaryPhotos(userId: string) {
  try {
    for (let guard = 0; guard < 50; guard++) {
      const { data, error } = await bucket().list(userId, { limit: 100 });
      if (error || !data || data.length === 0) return;
      const { error: removeError } = await bucket().remove(data.map((f) => `${userId}/${f.name}`));
      if (removeError) {
        console.error("[diary-photos] erase failed", removeError.message);
        return;
      }
      if (data.length < 100) return;
    }
  } catch (error) {
    console.error("[diary-photos] erase failed", error);
  }
}

/** path -> short-lived signed URL, for the photos on the page being rendered. Missing/failed paths are simply absent (the card shows the initial instead). */
export async function signedDiaryPhotoUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const wanted = Array.from(new Set(paths.filter((p): p is string => !!p)));
  const out = new Map<string, string>();
  if (wanted.length === 0) return out;
  const { data, error } = await bucket().createSignedUrls(wanted, SIGNED_URL_SECONDS);
  if (error || !data) return out;
  for (const row of data) if (row.path && row.signedUrl && !row.error) out.set(row.path, row.signedUrl);
  return out;
}
