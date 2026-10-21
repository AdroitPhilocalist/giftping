import "server-only";
import { createClient } from "@/lib/db/server";
import type { Database } from "@/lib/db/types";

export type CorporateEnquiryRow = Database["public"]["Tables"]["corporate_enquiries"]["Row"];

/**
 * Newest-first leads for the admin inbox. The list is deliberately capped: this is a working queue,
 * not an archive, and a small team should never have to scroll through years of enquiries to find
 * today's. Older rows stay in the table and can be surfaced with filters if the volume ever needs it.
 */
export async function listCorporateEnquiries(limit = 200): Promise<CorporateEnquiryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("corporate_enquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
