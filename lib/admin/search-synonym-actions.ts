"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { searchSynonymSchema, type SearchSynonymInput } from "@/lib/validation/search-synonym.schema";

// Runs with the ADMIN's own session: RLS (is_admin) is the real enforcement; this adds the role gate and messages.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}
const idSchema = z.string().uuid();
function refresh() {
  revalidatePath("/admin/search");
}

export async function saveSearchSynonymAction(raw: SearchSynonymInput, id?: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  const parsed = searchSynonymSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const { term, synonyms } = parsed.data;

  const supabase = await createClient();
  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid synonym group." };
    const { error } = await supabase.from("search_synonyms").update({ term, synonyms }).eq("id", id);
    if (error) return { error: error.code === "23505" ? "That term already has a synonym group — edit it instead." : "Couldn't save the synonym group." };
  } else {
    const { error } = await supabase.from("search_synonyms").insert({ term, synonyms });
    if (error) return { error: error.code === "23505" ? "That term already has a synonym group — edit it instead." : "Couldn't create the synonym group." };
  }
  refresh();
  return {};
}

export async function deleteSearchSynonymAction(id: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid synonym group." };
  const { error } = await (await createClient()).from("search_synonyms").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the synonym group." };
  refresh();
  return {};
}
