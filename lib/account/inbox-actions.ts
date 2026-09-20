"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

// Runs as the user: RLS limits it to their own rows and a DB trigger only lets `is_read` change.
export async function markNotificationReadAction(id: string): Promise<void> {
  const user = await getServerUser();
  if (!user || !z.string().uuid().safeParse(id).success) return;
  await (await createClient()).from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await getServerUser();
  if (!user) return;
  await (await createClient()).from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  revalidatePath("/", "layout");
}
