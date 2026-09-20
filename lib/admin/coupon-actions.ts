"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { endOfDayIST, startOfDayIST } from "@/lib/admin/coupons";
import { couponSchema, type CouponInput } from "@/lib/validation/coupon.schema";

// Runs with the ADMIN's own session: RLS (is_admin) plus the coupons_* constraints/trigger are the enforcement; this adds the role gate and messages.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}
const idSchema = z.string().uuid();
const refresh = () => revalidatePath("/admin/coupons");

export async function saveCouponAction(raw: CouponInput, id?: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  const parsed = couponSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const c = parsed.data;

  const row = {
    code: c.code,
    description: c.description,
    discount_type: c.discountType,
    discount_value: c.discountValue,
    min_order_amount: c.minOrderAmount,
    max_discount_amount: c.discountType === "percentage" ? c.maxDiscountAmount : null,
    usage_limit: c.usageLimit,
    per_user_limit: c.perUserLimit,
    vendor_id: c.vendorId,
    category_id: c.categoryId,
    ...(c.validFrom ? { valid_from: startOfDayIST(c.validFrom) } : {}),
    valid_until: c.validUntil ? endOfDayIST(c.validUntil) : null,
    is_active: c.isActive,
  };

  const supabase = await createClient();
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid coupon." };
    const { data: existing } = await supabase.from("coupons").select("code, used_count").eq("id", id).maybeSingle();
    if (!existing) return { error: "Coupon not found." };
    // A used coupon's code appears in customers' order records — renaming it would orphan them.
    if (existing.used_count > 0 && existing.code !== c.code) return { error: "This coupon has been used, so its code can't change. Create a new coupon instead." };
    const { error } = await supabase.from("coupons").update(row).eq("id", id);
    if (error) return { error: error.code === "23505" ? "That code is already in use." : "Couldn't save the coupon." };
  } else {
    const { error } = await supabase.from("coupons").insert(row);
    if (error) return { error: error.code === "23505" ? "That code is already in use." : "Couldn't create the coupon." };
  }
  refresh();
  return {};
}

export async function setCouponActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid coupon." };
  const { error } = await (await createClient()).from("coupons").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn't update the coupon." };
  refresh();
  return {};
}

/** Only never-used coupons can be deleted; a used one is paused instead so order history keeps its meaning. */
export async function deleteCouponAction(id: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid coupon." };
  const supabase = await createClient();
  const { data } = await supabase.from("coupons").select("used_count").eq("id", id).maybeSingle();
  if (!data) return { error: "Coupon not found." };
  if (data.used_count > 0) return { error: "This coupon has been used, so it can't be deleted — pause it instead." };
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the coupon." };
  refresh();
  return {};
}
