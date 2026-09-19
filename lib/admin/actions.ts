"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { requireRole } from "@/lib/auth/session";

export interface AdminActionResult {
  error?: string;
  success?: boolean;
}

// audit_logs and notifications have no INSERT policy for any client role on purpose (a tampered admin
// session shouldn't be able to forge or suppress its own trail), so these two writes use the
// service-role client — only *after* requireRole('admin') has passed in the calling action.
async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  await createAdminClient().from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: before as never,
    after_data: after as never,
  });
}

async function notify(userId: string, title: string, message: string, type: string, linkUrl: string) {
  await createAdminClient().from("notifications").insert({ user_id: userId, title, message, type, link_url: linkUrl });
}

export async function approveVendorAction(vendorId: string): Promise<AdminActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { data: vendor } = await supabase.from("vendors").select("id, user_id, status, business_name").eq("id", vendorId).maybeSingle();
  if (!vendor || !vendor.user_id) return { error: "Vendor not found." };

  const { error } = await supabase
    .from("vendors")
    .update({ status: "approved", approved_at: new Date().toISOString(), suspended_at: null })
    .eq("id", vendorId);
  if (error) return { error: "Couldn't approve the vendor." };

  // Only now does the applicant become a 'vendor' — until approval they stay an ordinary customer, so
  // the role itself (not just the vendor row's status) keeps them out of the portal.
  const { error: roleError } = await supabase.from("users").update({ role: "vendor" }).eq("id", vendor.user_id);
  if (roleError) return { error: "Vendor approved, but their role couldn't be updated." };

  await supabase.from("vendor_private").update({ rejection_reason: null }).eq("vendor_id", vendorId);

  await audit(admin.id, "vendor.approved", "vendor", vendorId, { status: vendor.status }, { status: "approved" });
  await notify(
    vendor.user_id,
    "Your vendor application was approved",
    `${vendor.business_name} is approved. You can now add products from your vendor dashboard.`,
    "vendor_approved",
    "/vendor/dashboard",
  );

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function rejectVendorAction(vendorId: string, reason: string): Promise<AdminActionResult> {
  const admin = await requireRole("admin");
  const cleaned = reason.trim();
  if (cleaned.length < 5) return { error: "Please give the applicant a short reason." };

  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendors").select("id, user_id, status, business_name").eq("id", vendorId).maybeSingle();
  if (!vendor) return { error: "Vendor not found." };

  const { error } = await supabase.from("vendors").update({ status: "rejected" }).eq("id", vendorId);
  if (error) return { error: "Couldn't reject the vendor." };
  await supabase.from("vendor_private").update({ rejection_reason: cleaned }).eq("vendor_id", vendorId);

  await audit(admin.id, "vendor.rejected", "vendor", vendorId, { status: vendor.status }, { status: "rejected", reason: cleaned });
  if (vendor.user_id) {
    await notify(vendor.user_id, "Update on your vendor application", cleaned, "vendor_rejected", "/vendor/register");
  }

  revalidatePath("/admin/vendors");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function approveProductAction(productId: string): Promise<AdminActionResult> {
  const admin = await requireRole("admin");
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, status, vendor:vendors(user_id)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };

  const { error } = await supabase
    .from("products")
    .update({ status: "active", approved_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", productId);
  if (error) return { error: "Couldn't approve the product." };

  await audit(admin.id, "product.approved", "product", productId, { status: product.status }, { status: "active" });
  const owner = Array.isArray(product.vendor) ? product.vendor[0]?.user_id : product.vendor?.user_id;
  if (owner) {
    await notify(owner, "Product approved", `"${product.name}" is now live in the mall.`, "product_approved", "/vendor/products");
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function rejectProductAction(productId: string, reason: string): Promise<AdminActionResult> {
  const admin = await requireRole("admin");
  const cleaned = reason.trim();
  if (cleaned.length < 5) return { error: "Please give the vendor a short reason." };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, status, vendor:vendors(user_id)")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };

  const { error } = await supabase.from("products").update({ status: "rejected", rejection_reason: cleaned }).eq("id", productId);
  if (error) return { error: "Couldn't reject the product." };

  await audit(admin.id, "product.rejected", "product", productId, { status: product.status }, { status: "rejected", reason: cleaned });
  const owner = Array.isArray(product.vendor) ? product.vendor[0]?.user_id : product.vendor?.user_id;
  if (owner) {
    await notify(owner, "Product needs changes", `"${product.name}": ${cleaned}`, "product_rejected", "/vendor/products");
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
