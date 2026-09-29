import Link from "next/link";
import { AvatarUpload } from "@/components/account/AvatarUpload";
import { ProfileForm } from "@/components/account/ProfileForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Profile — GiftPing" };

export default async function ProfilePage() {
  const sessionUser = await requireRole("customer", "vendor", "admin");
  // getServerUser()'s SessionUser doesn't carry phone/avatar_url (it's shared by every page/layout render,
  // so it only selects what's needed everywhere) — read this one page's own row directly, same as
  // account/addresses/page.tsx does for addresses.
  const { data: user } = await (await createClient())
    .from("users")
    .select("full_name, phone, avatar_url, email")
    .eq("id", sessionUser.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/account" className="text-sm text-brand-dark/60 hover:underline">
        ← My Account
      </Link>
      <h1 className="mt-2 font-heading text-3xl text-brand-dark">Profile</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Your name, contact number, and photo.</p>

      <div className="mt-6 space-y-6 rounded-card border border-brand-dark/10 bg-brand-surface p-5 shadow-card sm:p-6">
        <AvatarUpload url={user?.avatar_url ?? null} />
        <ProfileForm fullName={user?.full_name ?? sessionUser.fullName} phone={user?.phone ?? null} email={user?.email ?? sessionUser.email} />
      </div>
    </div>
  );
}
