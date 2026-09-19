import Link from "next/link";
import { AddressBook } from "@/components/shop/AddressBook";
import { requireRole } from "@/lib/auth/session";
import { getAddresses } from "@/lib/db/addresses";

export const metadata = { title: "Saved Addresses — GiftPing" };

export default async function AddressesPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const addresses = await getAddresses(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/account" className="text-sm text-brand-dark/60 hover:underline">
        ← My Account
      </Link>
      <h1 className="mt-2 font-heading text-3xl text-brand-dark">Saved Addresses</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Up to 10 addresses. Your default is pre-selected at checkout.</p>
      <div className="mt-6">
        <AddressBook addresses={addresses} />
      </div>
    </div>
  );
}
