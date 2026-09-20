"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { removeBrandingFiles } from "@/lib/storage/branding";

/** A vendor removes their OWN logo or banner (the boutique falls back to the default icon / plain header). */
export async function removeMyBrandingAction(kind: "logo" | "banner"): Promise<{ error?: string }> {
  if (!z.enum(["logo", "banner"]).safeParse(kind).success) return { error: "Invalid request." };
  const user = await getServerUser();
  if (!user || (user.role !== "vendor" && user.role !== "admin")) return { error: "Vendor access required." };
  const vendor = await getMyVendor(user.id);
  if (!vendor || vendor.status !== "approved") return { error: "Your boutique isn't active." };

  const previous = kind === "logo" ? vendor.logo_url : vendor.banner_url;
  const { error } = await (await createClient()).from("vendors").update(kind === "logo" ? { logo_url: null } : { banner_url: null }).eq("id", vendor.id);
  if (error) return { error: "Couldn't remove the image. Please try again." };
  await removeBrandingFiles(previous);
  revalidatePath("/vendor/settings");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendor.slug}`);
  return {};
}
