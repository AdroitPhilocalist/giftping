"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, diaryRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import {
  contactSchema, eventSchema, giftSchema, type ContactInput, type EventInput, type GiftInput,
} from "@/lib/validation/diary.schema";

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

export async function deleteContactAction(id: string): Promise<DiaryActionResult> {
  const g = await gate();
  if ("error" in g) return g;
  if (!idSchema.safeParse(id).success) return { error: "Invalid person." };
  const { error } = await (await createClient()).from("diary_contacts").delete().eq("id", id).eq("user_id", g.userId);
  if (error) return { error: "Couldn't remove them. Please try again." };
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
