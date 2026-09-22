"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { endOfDayIST, startOfDayIST } from "@/lib/admin/coupons";
import { getServerUser, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { THEME_PREVIEW_COOKIE } from "@/lib/theme/preview";
import { isThemeId, schedulableThemes } from "@/lib/theme/themes";
import { themeScheduleSchema, type ThemeScheduleInput } from "@/lib/validation/theme-schedule.schema";

// Runs with the admin's own session: RLS (is_admin) plus the site_themes_* constraints are the enforcement; this adds the role gate and messages.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}
const idSchema = z.string().uuid();

function refresh() {
  revalidatePath("/admin/themes");
  revalidatePath("/", "layout");
}

export async function saveThemeScheduleAction(raw: ThemeScheduleInput, id?: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  const parsed = themeScheduleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const v = parsed.data;
  if (!schedulableThemes().some((t) => t.id === v.themeId)) return { error: "That theme isn't available to schedule." };

  const row = {
    theme_id: v.themeId,
    note: v.note,
    starts_at: v.startsOn ? startOfDayIST(v.startsOn) : null,
    ends_at: v.endsOn ? endOfDayIST(v.endsOn) : null,
    is_active: v.isActive,
  };

  const supabase = await createClient();
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid schedule entry." };
    const { error } = await supabase.from("site_themes").update(row).eq("id", id);
    if (error) return { error: "Couldn't save the schedule." };
  } else {
    const { error } = await supabase.from("site_themes").insert(row);
    if (error) return { error: "Couldn't create the schedule." };
  }
  refresh();
  return {};
}

export async function setThemeScheduleActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid schedule entry." };
  const { error } = await (await createClient()).from("site_themes").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn't update the schedule." };
  refresh();
  return {};
}

export async function deleteThemeScheduleAction(id: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid schedule entry." };
  const { error } = await (await createClient()).from("site_themes").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the schedule." };
  refresh();
  return {};
}

/** Preview a theme in this admin's own browser only — see lib/theme/preview.ts for how it's read back. */
export async function setThemePreviewAction(themeId: string | null): Promise<{ error?: string }> {
  await requireRole("admin");
  const jar = await cookies();
  if (themeId === null) {
    jar.delete(THEME_PREVIEW_COOKIE);
  } else {
    if (!isThemeId(themeId)) return { error: "Unknown theme." };
    jar.set(THEME_PREVIEW_COOKIE, themeId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 6,
      path: "/",
    });
  }
  revalidatePath("/", "layout");
  return {};
}
