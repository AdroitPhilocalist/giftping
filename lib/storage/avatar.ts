import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";

/**
 * A customer's profile photo. Files live under `<userId>/` in the public `user-avatars` bucket; every
 * upload gets a fresh random name (so browsers can cache them "forever" and a replacement is never served
 * stale), and the previous file is deleted when a new one is saved. The bucket has no client write
 * policies — only these functions, running server-side after the caller has been proven to be that user,
 * ever write to it. Mirrors lib/storage/branding.ts's vendor-logo shape exactly.
 */
export const AVATAR_BUCKET = "user-avatars";

const bucket = () => createAdminClient().storage.from(AVATAR_BUCKET);

export async function storeUserAvatar(userId: string, avatar: Buffer): Promise<{ path: string; url: string }> {
  const path = `${userId}/avatar-${randomUUID()}.webp`;
  const { error } = await bucket().upload(path, avatar, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return { path, url: bucket().getPublicUrl(path).data.publicUrl };
}

function avatarPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${AVATAR_BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : url.slice(at + marker.length);
}

/** Best effort: a leftover file is harmless, a failed cleanup must not fail the request. */
export async function removeAvatarFile(url: string | null) {
  const path = avatarPathFromUrl(url);
  if (!path) return;
  await bucket().remove([path]);
}
