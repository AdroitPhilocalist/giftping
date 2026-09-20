import Link from "next/link";
import { UserRowActions } from "@/components/admin/UserRowActions";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Users — GiftPing Admin" };
const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  const me = await requireRole("admin");
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").replace(/[^A-Za-z0-9@._+ -]/g, "").slice(0, 60);

  // Admin's own session: RLS decides what's visible. (Diary tables have no admin policy at all — this page can't show anyone's diary.)
  let query = (await createClient())
    .from("users")
    .select("id, full_name, email, role, is_active, deleted_at, anonymized_at, created_at, last_login_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (["customer", "vendor", "admin"].includes(sp.role ?? "")) query = query.eq("role", sp.role!);
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  const { data: users, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (over: Record<string, string>) => `/admin/users?${new URLSearchParams(Object.entries({ q, role: sp.role ?? "", ...over }).filter(([, v]) => v)).toString()}`;

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Users</h1>
      <p className="mt-1 text-sm text-brand-dark/60">{count ?? 0} accounts. Suspending blocks sign-in immediately; erasing removes personal data (diary contents are never visible to admins).</p>

      <form method="get" className="mt-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search users" className="w-64 rounded-xl border border-brand-dark/15 bg-white px-4 py-2 text-sm" />
        <select name="role" defaultValue={sp.role ?? ""} aria-label="Filter by role" className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2 text-sm">
          <option value="">All roles</option><option value="customer">Customers</option><option value="vendor">Vendors</option><option value="admin">Admins</option>
        </select>
        <button className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-brand-light">Filter</button>
      </form>

      <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white">
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium text-brand-dark">{u.full_name}</p>
              <p className="truncate text-xs text-brand-dark/60">{u.anonymized_at ? "—" : u.email} · joined {new Date(u.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}{u.last_login_at ? ` · last seen ${new Date(u.last_login_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={u.role === "admin" ? "gold" : u.role === "vendor" ? "primary" : "neutral"}>{u.role}</Badge>
              {u.anonymized_at ? <Badge>erased</Badge> : !u.is_active ? <Badge variant="gold">suspended</Badge> : null}
              <UserRowActions userId={u.id} name={u.full_name} suspended={!u.is_active && !u.anonymized_at} erased={Boolean(u.anonymized_at)} isAdmin={u.role === "admin"} isSelf={u.id === me.id} />
            </div>
          </li>
        ))}
      </ul>
      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="text-brand-primary underline">← Newer</Link> : <span />}
          <span className="text-brand-dark/50">Page {page} of {pages}</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="text-brand-primary underline">Older →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
