"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { addressSchema, type AddressInput } from "@/lib/validation/address.schema";

export interface AddressActionResult {
  error?: string;
  id?: string;
}

function refresh() {
  revalidatePath("/checkout");
  revalidatePath("/account/addresses");
}

// All writes use the shopper's own session: RLS (addresses_all_own_or_admin) plus the address triggers
// (one default per user, max 10) are the enforcement, not just this code.

export async function saveAddressAction(raw: AddressInput, id?: string): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };

  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the address." };
  const a = parsed.data;

  const row = {
    label: a.label,
    recipient_name: a.recipientName,
    phone: a.phone,
    address_line1: a.addressLine1,
    address_line2: a.addressLine2,
    landmark: a.landmark,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: "India",
    is_default: a.isDefault,
  };

  const client = await createClient();
  if (id) {
    const { error } = await client.from("addresses").update(row).eq("id", id).eq("user_id", user.id);
    if (error) return { error: "Couldn't save that address. Please try again." };
    refresh();
    return { id };
  }

  const { data, error } = await client.from("addresses").insert({ ...row, user_id: user.id }).select("id").single();
  if (error || !data) {
    return { error: error?.message.includes("up to 10") ? "You can save up to 10 addresses." : "Couldn't save that address. Please try again." };
  }
  refresh();
  return { id: data.id };
}

export async function setDefaultAddressAction(id: string): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  const client = await createClient();
  const { error } = await client.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't update your default address." };
  refresh();
  return { id };
}

export async function deleteAddressAction(id: string): Promise<AddressActionResult> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  const client = await createClient();

  const { error } = await client.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Couldn't delete that address." };

  // If the default was deleted, promote the most recently added one so checkout always has a default.
  const { data: remaining } = await client
    .from("addresses")
    .select("id, is_default")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (remaining && remaining.length > 0 && !remaining.some((a) => a.is_default)) {
    await client.from("addresses").update({ is_default: true }).eq("id", remaining[0].id);
  }
  refresh();
  return {};
}
