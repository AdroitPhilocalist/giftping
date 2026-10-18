import Link from "next/link";
import { createClient } from "@/lib/db/server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

// The recovery link's PKCE code is exchanged in /auth/callback (a Route Handler), NOT here — a
// Server Component render can't write cookies, so doing it here left the session unpersisted and
// every "Update password" submit failed with "link expired". By the time this page renders, the
// session is already in the cookies; all that's left is to check it and show the form.
export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || error) {
    return (
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Link expired</h1>
        <p className="mt-2 text-sm text-brand-dark/60">
          This password reset link is invalid or has expired. Request a new one to continue.
        </p>
        <p className="mt-6 text-center text-sm text-brand-dark/60">
          <Link href="/reset-password" className="font-medium text-brand-primary hover:underline">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Choose a new password</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Make it at least 8 characters.</p>
      <UpdatePasswordForm />
    </div>
  );
}
