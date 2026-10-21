"use server";

import { revalidatePath } from "next/cache";
import { getRequestIp } from "@/lib/auth/request-ip";
import { checkRateLimit, corporateEnquiryRateLimit } from "@/lib/auth/rate-limit";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import {
  CORPORATE_GIFTING_NEED_LABELS,
  CORPORATE_QUANTITY_RANGE_LABELS,
  corporateEnquirySchema,
  type CorporateEnquiryData,
} from "@/lib/validation/corporate-enquiry.schema";

export interface CorporateEnquiryResult {
  success: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof CorporateEnquiryData, string>>;
}

/**
 * Public, unauthenticated corporate quote form. The browser validates first for a good experience, but
 * this action re-validates everything and is the only writer: the table has no INSERT policy for clients.
 */
export async function submitCorporateEnquiryAction(input: CorporateEnquiryData): Promise<CorporateEnquiryResult> {
  const parsed = corporateEnquirySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof CorporateEnquiryData, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key as keyof CorporateEnquiryData]) {
        fieldErrors[key as keyof CorporateEnquiryData] = issue.message;
      }
    }
    return { success: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;

  // Honeypot: a person never sees this field. Pretend it worked so a bot gets no feedback.
  if (data.website.trim().length > 0) return { success: true };

  const limit = await checkRateLimit(corporateEnquiryRateLimit, await getRequestIp());
  if (!limit.success) {
    return { success: false, error: "That's a few enquiries in a short time. Please wait a few minutes, or use the Contact page." };
  }

  const user = await getServerUser();
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from("corporate_enquiries")
    .insert({
      company_name: data.companyName,
      contact_name: data.contactName,
      work_email: data.workEmail,
      phone: data.phone,
      gifting_need: data.giftingNeed,
      quantity_range: data.quantityRange,
      budget_range: data.budgetRange,
      delivery_city: data.deliveryCity,
      delivery_date: data.deliveryDate,
      branding_requirements: data.brandingRequirements,
      message: data.message,
      user_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("Couldn't save corporate enquiry", error);
    return { success: false, error: "We couldn't save your brief just now. Please try again in a moment, or use the Contact page." };
  }

  // The admin inbox is the system of record; the notification is the nudge to go and look at it.
  // Best effort — a lead is never lost just because the bell couldn't be rung.
  try {
    const { data: admins } = await admin
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (admins && admins.length > 0) {
      const { error: notifyError } = await admin.from("notifications").insert(
        admins.map((adminUser) => ({
          user_id: adminUser.id,
          title: `New corporate enquiry from ${data.companyName}`,
          message: `${data.contactName} · ${CORPORATE_QUANTITY_RANGE_LABELS[data.quantityRange]} · ${CORPORATE_GIFTING_NEED_LABELS[data.giftingNeed]}`,
          type: "corporate_enquiry",
          link_url: "/admin/corporate-enquiries",
          metadata: { enquiry_id: row.id },
        })),
      );
      if (notifyError) console.error("Couldn't notify admins about corporate enquiry", notifyError);
    }
  } catch (notifyError) {
    console.error("Couldn't notify admins about corporate enquiry", notifyError);
  }

  revalidatePath("/admin/corporate-enquiries");
  return { success: true };
}
