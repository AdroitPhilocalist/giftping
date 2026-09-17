import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * Service-role Supabase client — bypasses RLS entirely. Server-only, never import from a
 * file that could end up in a Client Component bundle. Use for trusted server-side
 * operations only (webhooks, admin actions, cron jobs) — never in response to a raw,
 * unauthenticated client request without your own authorization check first.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
