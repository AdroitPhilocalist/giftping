"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, diaryRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import type { Database } from "@/lib/db/types";
import { removeDiaryPhoto } from "@/lib/storage/diary-photos";
import { isPlanStatus, stepIndex, type PlanStatus } from "@/lib/diary/plans";
import {
  contactPatchSchema, contactSchema, eventSchema, giftSchema, planSchema, type ContactInput, type ContactPatch, type EventInput, type GiftInput, type PlanInput,
} from "@/lib/validation/diary.schema";

type PlanUpdate = Database["public"]["Tables"]["diary_gift_plans"]["Update"];

export interface DiaryActionResult {
  error?: string;
  id?: string;
}

// Every write runs as the signed-in user through their own session: RLS (owner-only, no admin bypass) plus the diary_*_guard
// triggers (own contact only, per-user limits) are the enforcement — this file only adds validation, rate limiting and messages.
const idSchema = z.string().uuid();

async function gate(): Promise<{ userId: string } | { error: string }> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  if (!(await checkRateLimit(diaryRateLimit, await getRequestIp())).success) return { error: "You're doing that a little fast — please wait a moment." };
  return { userId: user.id };
}

function friendly(message: string | undefined, fallback: string) {
  // Our own trigger messages are written for people; anything else stays generic.
  return message && /diary|saved dates|up to 200|1 to 60|isn't yours/i.test(message) ? message : fallback;
}

const refresh = () => revalidatePath("/diary", "layout");
const isoDay = (value: string) => value.slice(0, 10);

export async function saveContactAction(raw: ContactInput, id?: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const c = parsed.data;

  const row = {
    name: c.name,
    relationship: c.relationship,
    interests: c.interests,
    tagline: c.tagline,
    gift_preferences: c.giftPreferences,
    notes: c.notes,
    budget_max: c.budgetMax,
    is_favorite: c.isFavorite,
  };
  const client = await createClient();
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid person." };
    const { data, error } = await client.from("diary_contacts").update(row).eq("id", id).eq("user_id", g.userId).select("id");
    if (error || !data?.length) return { error: "Couldn't save changes. Please try again." };
    refresh();
    return { id };
  }
  const { data, error } = await client.from("diary_contacts").insert({ ...row, user_id: g.userId }).select("id").single();
  if (error || !data) return { error: friendly(error?.message, "Couldn't add them. Please try again.") };
  refresh();
  return { id: data.id };
}

/** In-place edits from a person's page: only the fields that are sent are changed. */
export async function updateContactAction(id: string, raw: ContactPatch): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid person." };
  const parsed = contactPatchSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;
  const patch: Database["public"]["Tables"]["diary_contacts"]["Update"] = {};
  if (v.interests !== undefined) patch.interests = v.interests;
  if (v.notes !== undefined) patch.notes = v.notes;
  if (v.tagline !== undefined) patch.tagline = v.tagline;
  if (v.budgetMax !== undefined) patch.budget_max = v.budgetMax;
  if (Object.keys(patch).length === 0) return { id };
  const { data, error } = await (await createClient()).from("diary_contacts").update(patch).eq("id", id).eq("user_id", g.userId).select("id");
  if (error || !data?.length) return { error: "Couldn't save changes. Please try again." };
  refresh();
  return { id };
}

export async function deleteContactAction(id: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid person." };
  const client = await createClient();
  const { data: existing } = await client.from("diary_contacts").select("photo_url").eq("id", id).eq("user_id", g.userId).maybeSingle();
  const { error } = await client.from("diary_contacts").delete().eq("id", id).eq("user_id", g.userId);
  if (error) return { error: "Couldn't remove them. Please try again." };
  await removeDiaryPhoto(existing?.photo_url); // their photo is a file, so the row delete can't take it with it
  refresh();
  return {};
}

export async function saveEventAction(raw: EventInput, id?: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const e = parsed.data;

  const row = {
    contact_id: e.contactId,
    event_type: e.eventType,
    title: e.title,
    event_date: e.eventDate,
    is_recurring: e.isRecurring,
    reminder_days: e.reminderDays,
    notes: e.notes,
  };
  const client = await createClient();
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid date." };
    const { data, error } = await client.from("diary_events").update(row).eq("id", id).eq("user_id", g.userId).select("id");
    if (error || !data?.length) return { error: friendly(error?.message, "Couldn't save changes. Please try again.") };
    refresh();
    return { id };
  }
  const { data, error } = await client.from("diary_events").insert({ ...row, user_id: g.userId }).select("id").single();
  if (error || !data) return { error: friendly(error?.message, "Couldn't save that date. Please try again.") };
  refresh();
  return { id: data.id };
}

export async function deleteEventAction(id: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid date." };
  const { error } = await (await createClient()).from("diary_events").delete().eq("id", id).eq("user_id", g.userId);
  if (error) return { error: "Couldn't remove that date. Please try again." };
  refresh();
  return {};
}

export async function setEventActiveAction(id: string, active: boolean): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid date." };
  const { error } = await (await createClient()).from("diary_events").update({ is_active: active }).eq("id", id).eq("user_id", g.userId);
  if (error) return { error: "Couldn't update reminders. Please try again." };
  refresh();
  return {};
}

export async function logGiftAction(raw: GiftInput): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  const parsed = giftSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;
  const { data, error } = await (await createClient())
    .from("gift_history")
    .insert({
      user_id: g.userId,
      contact_id: v.contactId,
      gift_name: v.giftName,
      event_type: v.eventType,
      amount: v.amount,
      notes: v.notes,
      gifted_at: v.giftedOn ? `${v.giftedOn}T12:00:00+05:30` : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendly(error?.message, "Couldn't log that gift. Please try again.") };
  refresh();
  return { id: data.id };
}

export async function deleteGiftAction(id: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid gift." };
  const { error } = await (await createClient()).from("gift_history").delete().eq("id", id).eq("user_id", g.userId);
  if (error) return { error: "Couldn't remove that entry. Please try again." };
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Gift plans — Idea → Chosen → Ordered → Wrapped → Given, for one occurrence of a date
// ---------------------------------------------------------------------------
/** Start or update the plan for an occasion. Choosing a product (or writing a gift down) moves a fresh plan to "chosen". */
export async function savePlanAction(raw: PlanInput): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  const parsed = planSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the details." };
  const v = parsed.data;
  const client = await createClient();

  // Through the user's own session: RLS only shows them their own dates, so a stranger's event id simply isn't found.
  const { data: event } = await client.from("diary_events").select("id, contact_id").eq("id", v.eventId).eq("user_id", g.userId).maybeSingle();
  if (!event) return { error: "That date isn't in your diary." };

  let giftName = v.giftName;
  if (v.productId && !giftName) {
    const { data: product } = await client.from("products").select("name").eq("id", v.productId).maybeSingle();
    giftName = product?.name ?? null;
  }

  const { data: existing } = await client.from("diary_gift_plans").select("id, status").eq("event_id", v.eventId).eq("occasion_date", v.occasionDate).maybeSingle();
  const chosen = Boolean(v.productId || giftName);
  if (existing) {
    const patch: PlanUpdate = { note: v.note };
    if (v.productId || v.giftName) { patch.product_id = v.productId; patch.gift_name = giftName; }
    const status = v.status ?? (chosen && existing.status === "idea" ? "chosen" : null);
    if (status) patch.status = status;
    const { data, error } = await client.from("diary_gift_plans").update(patch).eq("id", existing.id).eq("user_id", g.userId).select("id");
    if (error || !data?.length) return { error: friendly(error?.message, "Couldn't save your plan. Please try again.") };
    refresh();
    return { id: existing.id };
  }
  const { data, error } = await client
    .from("diary_gift_plans")
    .insert({
      user_id: g.userId, contact_id: event.contact_id, event_id: v.eventId, occasion_date: v.occasionDate,
      product_id: v.productId, gift_name: giftName, note: v.note, status: v.status ?? (chosen ? "chosen" : "idea"),
    })
    .select("id")
    .single();
  if (error || !data) return { error: friendly(error?.message, "Couldn't start your plan. Please try again.") };
  refresh();
  return { id: data.id };
}

/**
 * Move a plan to a step. "Given" also writes the gift into the person's history (once — pressing it twice never logs it twice), so the timeline,
 * "Gift sorted" and next year's "last year you gave…" all learn from it.
 */
export async function setPlanStatusAction(planId: string, status: PlanStatus): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(planId).success || !isPlanStatus(status)) return { error: "Invalid plan." };
  const client = await createClient();

  const { data: plan } = await client
    .from("diary_gift_plans")
    .select("id, contact_id, event_id, occasion_date, product_id, gift_name, note, status")
    .eq("id", planId)
    .eq("user_id", g.userId)
    .maybeSingle();
  if (!plan) return { error: "Couldn't find that plan." };

  const { error } = await client.from("diary_gift_plans").update({ status }).eq("id", planId).eq("user_id", g.userId);
  if (error) return { error: "Couldn't update your plan. Please try again." };

  if (status === "given" && stepIndex(plan.status as PlanStatus) < stepIndex("given")) {
    const [{ data: event }, { data: product }] = await Promise.all([
      client.from("diary_events").select("event_type").eq("id", plan.event_id).maybeSingle(),
      plan.product_id ? client.from("products").select("name, base_price, sale_price").eq("id", plan.product_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const name = plan.gift_name ?? product?.name ?? "A gift";
    const today = isoDay(new Date().toISOString());
    const { data: already } = await client
      .from("gift_history").select("id").eq("contact_id", plan.contact_id).eq("gift_name", name).gte("gifted_at", `${today}T00:00:00Z`).limit(1);
    if (!already?.length) {
      await client.from("gift_history").insert({
        user_id: g.userId, contact_id: plan.contact_id, gift_name: name, product_id: plan.product_id, event_type: event?.event_type ?? null,
        amount: product ? Number(product.sale_price ?? product.base_price) : null, notes: plan.note,
        gifted_at: new Date().toISOString(),
      });
    }
  }
  refresh();
  return { id: planId };
}

export async function deletePlanAction(planId: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(planId).success) return { error: "Invalid plan." };
  const { error } = await (await createClient()).from("diary_gift_plans").delete().eq("id", planId).eq("user_id", g.userId);
  if (error) return { error: "Couldn't remove that plan. Please try again." };
  refresh();
  return {};
}
