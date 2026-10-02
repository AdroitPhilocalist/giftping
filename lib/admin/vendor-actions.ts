"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildVendorAccountEmail } from "@/lib/notifications/templates";
import { removeBrandingFiles } from "@/lib/storage/branding";
import { getOrdersWaitingOnSuspendedVendors } from "@/lib/db/admin-waiting";

const id = z.string().uuid();

async function gate() {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { error: "Admin access required." } as const;
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { error: "Please wait a moment and try again." } as const;
  return { user } as const;
}

/** Suspend hides the boutique's products from shoppers immediately (storefront RLS follows vendor status) and locks the vendor out of the portal. Paid orders stay visible to admins. */
export async function setVendorSuspendedAction(vendorId: string, suspended: boolean, reason?: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false, error: "Invalid vendor." };
  const cleanReason = (reason ?? "").trim().slice(0, 200) || null;
  if (suspended && !cleanReason) return { ok: false, error: "Give a short reason — the vendor is told." };

  const admin = createAdminClient();
  const { data: vendor } = await admin.from("vendors").select("business_name, status, user_id").eq("id", vendorId).maybeSingle();
  if (!vendor) return { ok: false, error: "Vendor not found." };
  if (suspended && vendor.status !== "approved") return { ok: false, error: "Only an approved vendor can be suspended." };
  if (!suspended && vendor.status !== "suspended") return { ok: false, error: "This vendor isn't suspended." };

  const { error } = await admin.from("vendors").update({ status: suspended ? "suspended" : "approved", suspended_at: suspended ? new Date().toISOString() : null }).eq("id", vendorId);
  if (error) return { ok: false, error: "Couldn't update the vendor." };
  await admin.from("audit_logs").insert({ actor_id: g.user.id, action: suspended ? "vendor.suspended" : "vendor.reinstated", entity_type: "vendor", entity_id: vendorId, before_data: { status: vendor.status } as never, after_data: { reason: cleanReason } as never });

  if (vendor.user_id) {
    const base = appBaseUrl();
    await notifyUser({
      userId: vendor.user_id, category: "vendor_updates", type: suspended ? "vendor_suspended" : "vendor_reinstated",
      title: suspended ? "Your boutique has been paused" : "Your boutique is live again",
      message: suspended ? `Your products are hidden from shoppers.${cleanReason ? ` Reason: ${cleanReason}` : ""}` : "Your products are visible to shoppers again.",
      linkUrl: "/vendor/dashboard",
      email: buildVendorAccountEmail({ vendorName: vendor.business_name, kind: suspended ? "suspended" : "reinstated", reason: cleanReason, dashboardUrl: `${base}/vendor/dashboard`, preferencesUrl: `${base}/account/notifications` }),
    });
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/dashboard");
  revalidatePath("/", "layout");

  // The moment to warn: suspending doesn't cancel orders customers already paid for — someone has to look after them.
  if (suspended) {
    const waiting = await getOrdersWaitingOnSuspendedVendors(admin, vendorId).catch(() => []);
    if (waiting.length > 0) {
      return { ok: true, message: `Boutique suspended. ${waiting.length} paid ${waiting.length === 1 ? "order is" : "orders are"} still waiting on them — see the dashboard to reinstate them or cancel & refund.` };
    }
  }
  return { ok: true };
}

/** Featured vendors surface on the homepage's showcase and the header's Boutiques mega-menu (lib/db/vendors.ts's getFeaturedVendors) — previously only settable by editing the seed data directly. */
export async function setVendorFeaturedAction(vendorId: string, featured: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false, error: "Invalid vendor." };

  const admin = createAdminClient();
  const { error } = await admin.from("vendors").update({ is_featured: featured }).eq("id", vendorId);
  if (error) return { ok: false, error: "Couldn't update the vendor." };
  await admin.from("audit_logs").insert({ actor_id: g.user.id, action: featured ? "vendor.featured" : "vendor.unfeatured", entity_type: "vendor", entity_id: vendorId, before_data: null, after_data: null });
  revalidatePath("/admin/vendors");
  revalidatePath("/", "layout");
  return { ok: true };
}

const rateSchema = z.union([z.literal(""), z.coerce.number().min(0, "Can't be negative").max(100, "Can't exceed 100")]);

/** Blank clears the override (category → platform default applies). Only affects FUTURE orders: every order snapshots its own commission. */
export async function setCommissionOverrideAction(vendorId: string, rate: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false, error: "Invalid vendor." };
  const parsed = rateSchema.safeParse(rate.trim());
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a percentage between 0 and 100." };
  const value = parsed.data === "" ? null : Math.round(parsed.data * 100) / 100;

  const admin = createAdminClient();
  const { data: before } = await admin.from("vendor_private").select("commission_rate").eq("vendor_id", vendorId).maybeSingle();
  const { error } = await admin.from("vendor_private").update({ commission_rate: value }).eq("vendor_id", vendorId);
  if (error) return { ok: false, error: "Couldn't save the commission." };
  await admin.from("audit_logs").insert({ actor_id: g.user.id, action: "vendor.commission_changed", entity_type: "vendor", entity_id: vendorId, before_data: { commission_rate: before?.commission_rate ?? null } as never, after_data: { commission_rate: value } as never });
  revalidatePath("/admin/vendors");
  return { ok: true };
}

/** Moderation: an admin can take down a vendor's logo or banner (say, an inappropriate image). The vendor is told and can upload a different one. */
export async function removeVendorBrandingAction(vendorId: string, kind: "logo" | "banner"): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(); if ("error" in g) return { ok: false, error: g.error };
  if (!id.safeParse(vendorId).success || !z.enum(["logo", "banner"]).safeParse(kind).success) return { ok: false, error: "Invalid request." };

  const admin = createAdminClient();
  const { data: vendor } = await admin.from("vendors").select("business_name, slug, user_id, logo_url, banner_url").eq("id", vendorId).maybeSingle();
  if (!vendor) return { ok: false, error: "Vendor not found." };
  const previous = kind === "logo" ? vendor.logo_url : vendor.banner_url;
  if (!previous) return { ok: false, error: `This boutique has no ${kind}.` };

  const { error } = await admin.from("vendors").update(kind === "logo" ? { logo_url: null } : { banner_url: null }).eq("id", vendorId);
  if (error) return { ok: false, error: "Couldn't remove the image." };
  await removeBrandingFiles(previous);
  await admin.from("audit_logs").insert({ actor_id: g.user.id, action: `vendor.${kind}_removed`, entity_type: "vendor", entity_id: vendorId, before_data: null, after_data: null });
  if (vendor.user_id) {
    await notifyUser({
      userId: vendor.user_id, category: "vendor_updates", type: "vendor_branding_removed", title: `Your boutique ${kind} was removed`,
      message: `GiftPing removed your boutique ${kind} because it didn't meet our guidelines. You can upload a different one in Settings.`, linkUrl: "/vendor/settings", push: false,
    });
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendor.slug}`);
  return { ok: true };
}
