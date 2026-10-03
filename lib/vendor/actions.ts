"use server";

import { toPersonalizationOptions } from "@/lib/personalization/engraving";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { getServerUser } from "@/lib/auth/session";
import { authRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { encryptSecret } from "@/lib/security/encryption";
import { removeProductImageFiles } from "@/lib/storage/upload";
import { uniqueSlug } from "@/lib/utils/slug";
import { vendorApplicationSchema, type VendorApplicationInput } from "@/lib/validation/vendor.schema";
import { parseFreeTags, productSchema, type ProductFormInput } from "@/lib/validation/product.schema";
import { sendBackToReviewIfLive, syncProductThumbnail } from "@/lib/vendor/product-helpers";

export interface VendorActionResult {
  error?: string;
  success?: boolean;
  id?: string;
}

// ---------------------------------------------------------------------------
// Vendor application
// ---------------------------------------------------------------------------

export async function registerVendorAction(raw: VendorApplicationInput): Promise<VendorActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in to apply as a vendor." };

  const limited = await checkRateLimit(authRateLimit, await getRequestIp());
  if (!limited.success) return { error: "Too many attempts. Please wait a minute and try again." };

  const parsed = vendorApplicationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  const input = parsed.data;

  const existing = await getMyVendor(user.id);
  if (existing) return { error: "You've already submitted a vendor application." };

  const supabase = await createClient();

  // Runs as the applicant with their own session: the tightened Stage 4 RLS (status must be
  // 'pending', no ratings/featured flag, one profile per user) is what enforces the rules here, not
  // just this function.
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .insert({
      user_id: user.id,
      business_name: input.businessName,
      business_type: input.businessType,
      slug: uniqueSlug(input.businessName),
      short_description: input.shortDescription || null,
      description: input.description,
      support_email: input.supportEmail,
      support_phone: input.supportPhone,
    })
    .select("id")
    .single();

  if (vendorError || !vendor) {
    return { error: "We couldn't submit your application. Please try again." };
  }

  const { error: privateError } = await supabase.from("vendor_private").insert({
    vendor_id: vendor.id,
    legal_name: input.businessName,
    gstin: input.gstin,
    pan: input.pan,
    bank_account_number_encrypted: encryptSecret(input.bankAccountNumber),
    bank_account_last4: input.bankAccountNumber.slice(-4),
    bank_ifsc: input.bankIfsc,
    bank_account_name: input.bankAccountName,
    warehouse_address: {
      line1: input.warehouseLine1,
      city: input.warehouseCity,
      state: input.warehouseState,
      pincode: input.warehousePincode,
    },
  });

  if (privateError) {
    // Don't leave a half-created application behind. Applicants have no DELETE policy on vendors
    // (deliberately), so this compensating cleanup is the one place the service role is used here.
    await createAdminClient().from("vendors").delete().eq("id", vendor.id);
    return { error: "We couldn't submit your application. Please try again." };
  }

  revalidatePath("/vendor/register");
  revalidatePath("/admin/vendors");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProductAction(
  productId: string | null,
  raw: ProductFormInput,
): Promise<VendorActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in again to continue." };

  const vendor = await getMyVendor(user.id);
  if (!vendor || vendor.status !== "approved") {
    return { error: "Your vendor account isn't approved yet." };
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  const input = parsed.data;

  const supabase = await createClient();
  const fields = {
    category_id: input.categoryId,
    name: input.name,
    short_description: input.shortDescription || null,
    description: input.description || null,
    base_price: input.basePrice,
    sale_price: input.salePrice ?? null,
    sku: input.sku || null,
    stock_quantity: input.stockQuantity,
    weight_grams: input.weightGrams ?? null,
    gst_rate: input.gstRate,
    hsn_code: input.hsnCode || null,
    tags: parseFreeTags(input.tags),
    occasion_tags: input.occasionTags,
    recipient_tags: input.recipientTags,
    // Live engraving setup (null/[] when the section is switched off). Clamped again on the way in; the database bounds its shape too.
    personalization_options: toPersonalizationOptions(input.engraving?.enabled ? { label: input.engraving.label.trim(), maxLength: input.engraving.maxLength, required: input.engraving.required, style: input.engraving.style, x: input.engraving.x, y: input.engraving.y, w: input.engraving.w, h: input.engraving.h, rotate: input.engraving.rotate } : null) as never,
  };

  let id = productId;

  if (id === null) {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...fields, vendor_id: vendor.id, slug: uniqueSlug(input.name) })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.code === "23505" ? "That SKU is already in use." : "Couldn't save the product." };
    }
    id = data.id;
  } else {
    const { error } = await supabase.from("products").update(fields).eq("id", id).eq("vendor_id", vendor.id);
    if (error) {
      return { error: error.code === "23505" ? "That SKU is already in use." : "Couldn't save the product." };
    }
    await sendBackToReviewIfLive(supabase, id);
  }

  const variantError = await syncVariants(supabase, id, input.variants);
  if (variantError) return { error: variantError, id };

  revalidatePath("/vendor/products");
  return { success: true, id };
}

async function syncVariants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  variants: NonNullable<ReturnType<typeof productSchema.parse>["variants"]>,
): Promise<string | null> {
  const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
  const keepIds = new Set(variants.map((v) => v.id).filter(Boolean));

  // Removed variants are deactivated, not deleted: order_items may already reference them, and a hard
  // delete would either fail on that FK or erase what a past order actually contained.
  const removed = (existing ?? []).filter((v) => !keepIds.has(v.id)).map((v) => v.id);
  if (removed.length > 0) {
    await supabase.from("product_variants").update({ is_active: false }).in("id", removed);
  }

  for (const variant of variants) {
    const row = {
      name: variant.name,
      value: variant.value,
      price_adjustment: variant.priceAdjustment,
      stock_quantity: variant.stockQuantity,
      is_active: true,
    };
    const { error } = variant.id
      ? await supabase.from("product_variants").update(row).eq("id", variant.id).eq("product_id", productId)
      : await supabase.from("product_variants").insert({ ...row, product_id: productId });
    if (error) return "Product saved, but a variant couldn't be saved.";
  }
  return null;
}

export async function setProductActiveAction(productId: string, active: boolean): Promise<VendorActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in again to continue." };
  const vendor = await getMyVendor(user.id);
  if (!vendor) return { error: "No vendor profile." };

  const supabase = await createClient();
  // A listing without a photo shows a blank placeholder to shoppers (and lands in the reviewer's queue), so it can't be sent for review yet.
  if (active) {
    const { data: product } = await supabase.from("products").select("thumbnail_url").eq("id", productId).eq("vendor_id", vendor.id).maybeSingle();
    if (!product) return { error: "Product not found." };
    if (!product.thumbnail_url) return { error: "Add at least one photo before sending this product for review." };
  }
  // Deactivating is instant. Reactivating goes back through admin review ('pending') — the DB trigger
  // doesn't let a vendor set 'active' themselves.
  const { error } = await supabase
    .from("products")
    .update({ status: active ? "pending" : "inactive" })
    .eq("id", productId)
    .eq("vendor_id", vendor.id);

  if (error) return { error: "Couldn't update the product." };
  revalidatePath("/vendor/products");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Product images (upload itself is the /api/vendor/upload-image route handler)
// ---------------------------------------------------------------------------

export async function deleteProductImageAction(imageId: string): Promise<VendorActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in again to continue." };

  const supabase = await createClient();
  // RLS (owns_product) is what stops a vendor reaching another vendor's image row here.
  const { data: image } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, is_primary")
    .eq("id", imageId)
    .maybeSingle();
  if (!image) return { error: "Image not found." };

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { error: "Couldn't remove the image." };

  if (image.storage_path) await removeProductImageFiles(image.storage_path);

  if (image.is_primary) {
    const { data: next } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from("product_images").update({ is_primary: true }).eq("id", next.id);
  }
  await syncProductThumbnail(supabase, image.product_id);
  await sendBackToReviewIfLive(supabase, image.product_id);

  revalidatePath("/vendor/products");
  return { success: true };
}

export async function setPrimaryImageAction(imageId: string): Promise<VendorActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Sign in again to continue." };

  const supabase = await createClient();
  const { data: image } = await supabase.from("product_images").select("id, product_id").eq("id", imageId).maybeSingle();
  if (!image) return { error: "Image not found." };

  await supabase.from("product_images").update({ is_primary: false }).eq("product_id", image.product_id);
  const { error } = await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (error) return { error: "Couldn't update the image." };

  await syncProductThumbnail(supabase, image.product_id);
  revalidatePath("/vendor/products");
  return { success: true };
}
