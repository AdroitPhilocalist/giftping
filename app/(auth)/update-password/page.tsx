import { createClient } from "@/lib/db/server";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();

  let exchangeFailed = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeFailed = Boolean(error);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || exchangeFailed) {
    return (
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Link expired</h1>
        <p className="mt-2 text-sm text-brand-dark/60">
          This password reset link is invalid or has expired. Request a new one from the sign-in page.
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
