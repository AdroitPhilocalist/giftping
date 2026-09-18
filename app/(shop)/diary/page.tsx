import { requireRole } from "@/lib/auth/session";

export default async function DiaryPage() {
  const user = await requireRole("customer", "vendor", "admin");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
      <h1 className="font-heading text-3xl text-brand-dark">My Gifting Diary</h1>
      <p className="mt-2 text-sm text-brand-dark/60">
        Welcome back, {user.fullName.split(" ")[0]}. The full diary experience — contacts, upcoming
        occasions, and smart suggestions — is built in Stage 9.
      </p>
    </div>
  );
}
