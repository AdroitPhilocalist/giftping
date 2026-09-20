"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

const schema = z.object({ category: z.enum(["diary_reminders", "order_updates", "promotions"]), emailEnabled: z.boolean() });

/** Runs as the user (RLS: notification_preferences is owner-only). No row means "on" — a shopper opts OUT, never in by accident. */
export async function setEmailPreferenceAction(raw: z.input<typeof schema>): Promise<{ error?: string }> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid choice." };

  const { error } = await (await createClient())
    .from("notification_preferences")
    .upsert({ user_id: user.id, category: parsed.data.category, email_enabled: parsed.data.emailEnabled }, { onConflict: "user_id,category" });
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/account/notifications");
  return {};
}
