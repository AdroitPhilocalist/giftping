"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile.schema";

export interface ProfileActionResult {
  error?: string;
}

/**
 * Name and phone number only. RLS (users_update_own_or_admin) already lets a signed-in user update their
 * own row, and the only restrictive trigger on `users` blocks changing `role` — but neither stops a
 * crafted request from also touching unrelated columns, so this whitelists exactly the two fields the
 * profile form actually edits, same pattern as lib/account/address-actions.ts.
 */
export async function updateProfileAction(raw: ProfileInput): Promise<ProfileActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };

  const { error } = await (await createClient())
    .from("users")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", user.id);
  if (error) return { error: "Couldn't save your details. Please try again." };

  revalidatePath("/account");
  revalidatePath("/account/profile");
  revalidatePath("/", "layout"); // the navbar reads the signed-in user's name
  return {};
}
