"use server";

import { z } from "zod";
import { adminMessageRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { getApprovedVendors } from "@/lib/db/vendors";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildAdminMessageEmail } from "@/lib/notifications/templates";

export interface VendorMessageResult {
  ok: boolean;
  error?: string;
  sent?: number;
}

const id = z.string().uuid();
const messageSchema = z.object({
  subject: z.string().trim().min(3, "Give it a subject.").max(150),
  message: z.string().trim().min(10, "Say a little more.").max(4000),
});

async function gate() {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { error: "Admin access required." } as const;
  if (!(await checkRateLimit(adminMessageRateLimit, `${user.id}:${await getRequestIp()}`)).success) {
    return { error: "Please wait a moment and try again." } as const;
  }
  return { user } as const;
}

/** A direct message to one vendor — in-app always, plus email (the "official communication" the spec asks
 * for is durable, not just an inbox row that could go unread). Respects that vendor's own vendor_updates
 * email preference, same as every other notifyUser() call in the app — an admin message isn't exempt from
 * an opt-out. */
export async function messageVendorAction(vendorId: string, subject: string, message: string): Promise<VendorMessageResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  if (!id.safeParse(vendorId).success) return { ok: false, error: "Invalid vendor." };
  const parsed = messageSchema.safeParse({ subject, message });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your message." };

  const admin = createAdminClient();
  const { data: vendor } = await admin.from("vendors").select("business_name, user_id").eq("id", vendorId).maybeSingle();
  if (!vendor) return { ok: false, error: "Vendor not found." };
  if (!vendor.user_id) return { ok: false, error: "This vendor has no linked account." };

  const base = appBaseUrl();
  await notifyUser({
    userId: vendor.user_id,
    category: "vendor_updates",
    type: "admin_message",
    title: parsed.data.subject,
    message: parsed.data.message,
    linkUrl: "/vendor/dashboard",
    email: buildAdminMessageEmail({
      vendorName: vendor.business_name,
      subject: parsed.data.subject,
      message: parsed.data.message,
      dashboardUrl: `${base}/vendor/dashboard`,
      preferencesUrl: `${base}/account/notifications`,
    }),
  });

  await admin.from("audit_logs").insert({
    actor_id: g.user.id, action: "vendor.messaged", entity_type: "vendor", entity_id: vendorId,
    before_data: null, after_data: { subject: parsed.data.subject } as never,
  });

  return { ok: true, sent: 1 };
}

/** Broadcasts the same message to every approved vendor — one notifyUser() call per vendor, same delivery
 * rules (email preference respected per-recipient) as a single message. Best-effort: one vendor's email
 * provider hiccup must not stop the rest of the broadcast from going out. */
export async function broadcastVendorMessageAction(subject: string, message: string): Promise<VendorMessageResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const parsed = messageSchema.safeParse({ subject, message });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your message." };

  const vendors = (await getApprovedVendors()).filter((v) => v.user_id);
  if (vendors.length === 0) return { ok: false, error: "There are no approved vendors to message." };

  const base = appBaseUrl();
  const admin = createAdminClient();
  let sent = 0;
  for (const vendor of vendors) {
    try {
      await notifyUser({
        userId: vendor.user_id!,
        category: "vendor_updates",
        type: "admin_message",
        title: parsed.data.subject,
        message: parsed.data.message,
        linkUrl: "/vendor/dashboard",
        email: buildAdminMessageEmail({
          vendorName: vendor.business_name,
          subject: parsed.data.subject,
          message: parsed.data.message,
          dashboardUrl: `${base}/vendor/dashboard`,
          preferencesUrl: `${base}/account/notifications`,
        }),
      });
      sent += 1;
    } catch (error) {
      console.error("Broadcast message failed for vendor", vendor.user_id, error);
    }
  }

  await admin.from("audit_logs").insert({
    actor_id: g.user.id, action: "vendor.broadcast", entity_type: "vendor", entity_id: null,
    before_data: null, after_data: { subject: parsed.data.subject, recipientCount: sent } as never,
  });

  return { ok: true, sent };
}
