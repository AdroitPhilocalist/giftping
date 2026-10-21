"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { corporateEnquiryUpdateSchema } from "@/lib/validation/corporate-enquiry.schema";

export interface CorporateEnquiryUpdateResult {
  success: boolean;
  error?: string;
}

/** Admin-only status/notes update for a lead. Enquiries themselves are immutable from the client side. */
export async function updateCorporateEnquiryAction(input: unknown): Promise<CorporateEnquiryUpdateResult> {
  const user = await requireRole("admin");
  const parsed = corporateEnquiryUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the enquiry details." };

  const { id, status, internalNote } = parsed.data;
  const supabase = await createClient();
  const { data: before, error: readError } = await supabase
    .from("corporate_enquiries")
    .select("status, internal_note")
    .eq("id", id)
    .maybeSingle();

  if (readError || !before) return { success: false, error: "That enquiry no longer exists." };

  const { error } = await supabase
    .from("corporate_enquiries")
    .update({ status, internal_note: internalNote })
    .eq("id", id);

  if (error) {
    console.error("Couldn't update corporate enquiry", error);
    return { success: false, error: "Couldn't save that change. Please try again." };
  }

  await createAdminClient().from("audit_logs").insert({
    actor_id: user.id,
    action: "corporate_enquiry.updated",
    entity_type: "corporate_enquiry",
    entity_id: id,
    before_data: before as never,
    after_data: { status, internal_note: internalNote } as never,
  });

  revalidatePath("/admin/corporate-enquiries");
  return { success: true };
}
