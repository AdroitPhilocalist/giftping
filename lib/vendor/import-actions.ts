"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { MAX_IMPORT_CHARS } from "@/lib/vendor/product-csv";
import { commitProductImport, previewProductImport, type ImportPreview, type ImportResult } from "@/lib/vendor/product-import";

const csvSchema = z.string().max(MAX_IMPORT_CHARS + 1000);

/** The vendor is whoever is signed in (approved boutique required) — never an id from the client. */
async function approvedVendorId(): Promise<{ id: string; userId: string } | { error: string }> {
  const user = await getServerUser();
  if (!user || (user.role !== "vendor" && user.role !== "admin")) return { error: "Vendor access required." };
  const vendor = await getMyVendor(user.id);
  if (!vendor || vendor.status !== "approved") return { error: "Your boutique isn't active." };
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { error: "Please wait a moment and try again." };
  return { id: vendor.id, userId: user.id };
}

export async function previewProductImportAction(csv: string): Promise<{ preview?: ImportPreview; error?: string }> {
  const v = await approvedVendorId();
  if ("error" in v) return { error: v.error };
  const parsed = csvSchema.safeParse(csv);
  if (!parsed.success) return { error: "That file is too large. Split it into files of up to 200 products." };
  return { preview: await previewProductImport(v.id, parsed.data) };
}

export async function commitProductImportAction(csv: string): Promise<ImportResult> {
  const v = await approvedVendorId();
  if ("error" in v) return { ok: false, error: v.error };
  const parsed = csvSchema.safeParse(csv);
  if (!parsed.success) return { ok: false, error: "That file is too large." };
  const result = await commitProductImport(v.id, parsed.data, v.userId);
  if (result.ok) revalidatePath("/vendor/products");
  return result;
}
