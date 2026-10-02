"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

const schema = z.object({ category: z.enum(["diary_reminders", "order_updates", "wishlist_alerts", "promotions"]), channel: z.enum(["email", "push"]), enabled: z.boolean() });

/** Runs as the user (RLS: notification_preferences is owner-only). No row means "on" — a shopper opts OUT, never in by accident. */
export async function setChannelPreferenceAction(raw: z.input<typeof schema>): Promise<{ error?: string }> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid choice." };

  const { error } = await (await createClient())
    .from("notification_preferences")
    .upsert(
      { user_id: user.id, category: parsed.data.category, ...(parsed.data.channel === "email" ? { email_enabled: parsed.data.enabled } : { push_enabled: parsed.data.enabled }) },
      { onConflict: "user_id,category" }, // only the named column is written, so the other channel's choice is preserved
    );
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/account/notifications");
  return {};
}
