"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { eraseUser, setUserSuspended } from "@/lib/admin/users";

const idSchema = z.string().uuid();

/** Role is re-read from the DATABASE by getServerUser — never a cookie or client claim. An admin can't act on themselves. */
async function gate(targetId: string) {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { error: "Admin access required." } as const;
  if (!idSchema.safeParse(targetId).success) return { error: "Invalid account." } as const;
  if (user.id === targetId) return { error: "You can't do that to your own account." } as const;
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { error: "Please wait a moment and try again." } as const;
  return { user } as const;
}

export async function suspendUserAction(userId: string, suspended: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(userId);
  if ("error" in g) return { ok: false, error: g.error };
  const r = await setUserSuspended({ userId, actorId: g.user.id, suspended });
  revalidatePath("/admin/users");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function eraseUserAsAdminAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const g = await gate(userId);
  if ("error" in g) return { ok: false, error: g.error };
  const r = await eraseUser({ userId, actorId: g.user.id, byAdmin: true });
  revalidatePath("/admin/users");
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}
