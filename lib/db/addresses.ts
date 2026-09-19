import { createClient } from "@/lib/db/server";

export async function getAddresses(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, pincode, is_default")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type SavedAddress = Awaited<ReturnType<typeof getAddresses>>[number];
