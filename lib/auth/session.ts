import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/db/server";
import type { Database } from "@/lib/db/types";

export type UserRole = Database["public"]["Tables"]["users"]["Row"]["role"];

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Reads the current session's user, joined with their public.users row for role/profile
 * data. Returns null if unauthenticated. Always reads the role from the database — never
 * trust a role claim from the client (see CLAUDE.md security requirements).
 */
// cache(): the Navbar, layouts and pages all ask for the current user during one render — memoize per request.
export const getServerUser = cache(async function getServerUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active, deleted_at")
    .eq("id", authUser.id)
    .single();

  // A suspended or erased account is signed out on the very next request, not when its token eventually expires.
  if (!profile || !profile.is_active || profile.deleted_at) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
  };
});

/**
 * Throws if there's no authenticated user, or if their role isn't one of `allowed`. Use at
 * the top of any Server Component/Server Action/Route Handler that must be role-gated —
 * proxy.ts handles the fast UI-level redirect, this is the actual server-side enforcement
 * that a request can't bypass.
 */
export async function requireRole(...allowed: UserRole[]): Promise<SessionUser> {
  const user = await getServerUser();

  if (!user) {
    throw new AuthError("UNAUTHENTICATED", "You must be signed in.");
  }

  if (!allowed.includes(user.role)) {
    throw new AuthError("FORBIDDEN", "You don't have access to this resource.");
  }

  return user;
}

export class AuthError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
