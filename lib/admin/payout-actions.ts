"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createSettlement, markSettlementPaid, revealBankDetails, voidSettlement } from "@/lib/admin/payouts";

const id = z.string().uuid();

/** Admin role is re-read from the database; money actions are also rate-limited. */
async function gate() {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { error: "Admin access required." } as const;
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { error: "Please wait a moment and try again." } as const;
  return { user } as const;
}
const refresh = () => { revalidatePath("/admin/settlements"); revalidatePath("/vendor/payouts"); };

export async function createSettlementAction(vendorId: string) {
  const g = await gate(); if ("error" in g) return { ok: false as const, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false as const, error: "Invalid vendor." };
  const r = await createSettlement({ vendorId, adminId: g.user.id }); refresh(); return r;
}

export async function markSettlementPaidAction(settlementId: string, reference: string) {
  const g = await gate(); if ("error" in g) return { ok: false as const, error: g.error };
  if (!id.safeParse(settlementId).success) return { ok: false as const, error: "Invalid settlement." };
  const r = await markSettlementPaid({ settlementId, reference, adminId: g.user.id }); refresh(); return r;
}

export async function voidSettlementAction(settlementId: string, note: string) {
  const g = await gate(); if ("error" in g) return { ok: false as const, error: g.error };
  if (!id.safeParse(settlementId).success) return { ok: false as const, error: "Invalid settlement." };
  const r = await voidSettlement({ settlementId, note: note.trim() || "Voided by admin", adminId: g.user.id }); refresh(); return r;
}

export async function revealBankDetailsAction(vendorId: string) {
  const g = await gate(); if ("error" in g) return { ok: false as const, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false as const, error: "Invalid vendor." };
  return revealBankDetails({ vendorId, adminId: g.user.id });
}
