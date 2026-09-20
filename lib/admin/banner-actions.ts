"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { endOfDayIST, startOfDayIST } from "@/lib/admin/coupons";
import { BANNER_PATH_PATTERN, bannerImageExists, bannerUrls, removeBannerImageFiles } from "@/lib/storage/upload";
import { bannerSchema, type BannerInput } from "@/lib/validation/banner.schema";

// Runs with the ADMIN's own session: RLS (is_admin) plus the banners_* constraints are the enforcement; this adds the role gate, messages and the storage side.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}
const idSchema = z.string().uuid();
function refresh() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function saveBannerAction(raw: BannerInput, id?: string): Promise<{ error?: string }> {
  const user = await admin();
  if (!user) return { error: "Admin access required." };
  const parsed = bannerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const b = parsed.data;

  const supabase = await createClient();
  let existing: { storage_path: string | null } | null = null;
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid banner." };
    const { data } = await supabase.from("banners").select("storage_path").eq("id", id).maybeSingle();
    if (!data) return { error: "Banner not found." };
    existing = data;
  } else if (!b.imagePath) {
    return { error: "Add an image." };
  }

  // A new image may only be one this server produced (`banners/<uuid>-full.webp`) and that really exists in storage.
  let image: { image_url: string; image_medium_url: string; storage_path: string } | null = null;
  if (b.imagePath) {
    if (!BANNER_PATH_PATTERN.test(b.imagePath) || !(await bannerImageExists(b.imagePath))) return { error: "That image upload wasn't found — please upload it again." };
    // one upload belongs to one banner: sharing files would let deleting one banner break another
    const { count } = await supabase.from("banners").select("id", { count: "exact", head: true }).eq("storage_path", b.imagePath).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    if ((count ?? 0) > 0) return { error: "That image is already used by another banner — upload it again." };
    const urls = bannerUrls(b.imagePath);
    image = { image_url: urls.url, image_medium_url: urls.mediumUrl, storage_path: b.imagePath };
  }

  const row = {
    headline: b.headline,
    subheading: b.subheading,
    cta_text: b.ctaUrl ? b.ctaText : null,
    cta_url: b.ctaUrl,
    alt_text: b.altText,
    target_audience: b.audience,
    starts_at: b.startsOn ? startOfDayIST(b.startsOn) : null,
    ends_at: b.endsOn ? endOfDayIST(b.endsOn) : null,
    is_active: b.isActive,
    ...(image ?? {}),
  };

  if (id) {
    const { error } = await supabase.from("banners").update(row).eq("id", id);
    if (error) return { error: "Couldn't save the banner." };
    if (image && existing?.storage_path && existing.storage_path !== image.storage_path) await removeBannerImageFiles(existing.storage_path);
  } else {
    // new banners go to the end of the line
    const { data: last } = await supabase.from("banners").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("banners").insert({ ...row, image_url: image!.image_url, image_medium_url: image!.image_medium_url, storage_path: image!.storage_path, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) {
      await removeBannerImageFiles(image!.storage_path);
      return { error: "Couldn't create the banner." };
    }
  }
  refresh();
  return {};
}

export async function setBannerActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid banner." };
  const { error } = await (await createClient()).from("banners").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn't update the banner." };
  refresh();
  return {};
}

export async function deleteBannerAction(id: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid banner." };
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return { error: "Banner not found." };
  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the banner." };
  if (data.storage_path) await removeBannerImageFiles(data.storage_path);
  refresh();
  return {};
}

/** Moves a banner one place earlier or later: swaps its position with its neighbour (two writes), renumbering the whole short list only when two banners tie. */
export async function moveBannerAction(id: string, direction: "up" | "down"): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid banner." };
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("id, sort_order").order("sort_order").order("created_at");
  const rows = data ?? [];
  const from = rows.findIndex((r) => r.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return {};

  const writes: PromiseLike<{ error: unknown }>[] = [];
  if (rows[from].sort_order !== rows[to].sort_order) {
    writes.push(supabase.from("banners").update({ sort_order: rows[to].sort_order }).eq("id", rows[from].id));
    writes.push(supabase.from("banners").update({ sort_order: rows[from].sort_order }).eq("id", rows[to].id));
  } else {
    const ids = rows.map((r) => r.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    ids.forEach((bannerId, index) => writes.push(supabase.from("banners").update({ sort_order: (index + 1) * 10 }).eq("id", bannerId)));
  }
  const results = await Promise.all(writes);
  if (results.some((r) => r.error)) return { error: "Couldn't reorder the banners." };
  refresh();
  return {};
}
