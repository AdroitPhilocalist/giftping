"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit, authRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { eraseUser } from "@/lib/admin/users";
import { createClient } from "@/lib/db/server";

/** Self-service erasure. The person must type DELETE; the account being erased is ALWAYS the signed-in one (no id is accepted from the client). */
export async function deleteMyAccountAction(confirmation: string): Promise<{ error: string } | never> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  if (!(await checkRateLimit(authRateLimit, await getRequestIp())).success) return { error: "Please wait a minute and try again." };
  if (!z.literal("DELETE").safeParse(confirmation.trim()).success) return { error: "Type DELETE in capitals to confirm." };
  if (user.role === "admin") return { error: "Admin accounts can't be deleted here — ask another admin." };

  const result = await eraseUser({ userId: user.id, actorId: user.id, byAdmin: false });
  if (!result.ok) return { error: result.error };

  await (await createClient()).auth.signOut();
  redirect("/?account=deleted");
}
