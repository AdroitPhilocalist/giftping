import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { tokenOwner } from "@/lib/marketing/unsubscribe";

export const metadata = { title: "Unsubscribe — GiftPing", robots: { index: false, follow: false } };

/**
 * Public, no login: the signed link in a marketing email is the credential. The page shows a confirm button and the button POSTs —
 * merely OPENING the link (which mail scanners do) changes nothing.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  const sp = await searchParams;
  const token = sp.t ?? null;
  const owner = sp.done || sp.error ? null : tokenOwner(token);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-3xl text-brand-dark">Email preferences</h1>

      {sp.done ? (
        <div className="mt-6 space-y-3">
          <p className="rounded-xl bg-brand-primary/10 p-4 text-brand-primary">You&apos;re unsubscribed. We won&apos;t send you offers or new-arrival emails any more.</p>
          <p className="text-sm text-brand-dark/60">You&apos;ll still get emails about your orders and anything you&apos;ve asked us to remind you about. Changed your mind? You can turn marketing emails back on any time in your <Link href="/account/notifications" className="underline">notification settings</Link>.</p>
        </div>
      ) : sp.error === "failed" ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-900">Something went wrong and we couldn&apos;t update your preference. Please try again, or sign in and switch marketing emails off in your <Link href="/account/notifications" className="underline">notification settings</Link>.</p>
      ) : (sp.error && sp.error !== "failed") || (owner && "error" in owner) ? (
        <div className="mt-6 space-y-3 text-sm text-brand-dark/70">
          <p className="rounded-xl bg-brand-accent/70 p-4 text-brand-dark">{owner && "error" in owner && owner.error === "unavailable" ? "Unsubscribing by link isn't available right now." : "This unsubscribe link isn't valid."}</p>
          <p>You can always switch marketing emails off yourself: <Link href="/account/notifications" className="underline">sign in and open your notification settings</Link>.</p>
        </div>
      ) : (
        <form action="/api/marketing/unsubscribe" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="t" value={token ?? ""} />
          <input type="hidden" name="from" value="page" />
          <p className="text-brand-dark/70">Stop receiving offers, new arrivals and gifting ideas from GiftPing by email?</p>
          <Button type="submit">Yes, unsubscribe me</Button>
          <p className="text-xs text-brand-dark/50">This won&apos;t affect order updates or diary reminders.</p>
        </form>
      )}
    </div>
  );
}
