import { personalizationSummary } from "@/lib/commerce/personalization";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";
import { ProductImage } from "@/components/shop/ProductImage";
import { getServerUser } from "@/lib/auth/session";
import { loadCheckoutSnapshot, quoteFor } from "@/lib/commerce/checkout";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { getAddresses } from "@/lib/db/addresses";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Checkout — GiftPing" };

export default async function CheckoutPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in?redirectTo=/checkout"); // proxy.ts normally gets there first

  const [snapshot, addresses, returnDays] = await Promise.all([loadCheckoutSnapshot(user.id), getAddresses(user.id), getReturnWindowDays()]);
  if (!snapshot) redirect("/cart");

  const quote = quoteFor(snapshot, false);
  const quoteByKey = new Map(quote.lines.map((l) => [l.key, l]));

  const blocked =
    snapshot.issues.length > 0
      ? `${snapshot.issues[0]} Please review your cart before continuing.`
      : (snapshot.couponLookupError ?? null);

  const groups = new Map<string, { vendorName: string; lines: typeof snapshot.lines }>();
  for (const line of snapshot.lines) {
    const group = groups.get(line.vendorId) ?? { vendorName: line.vendorName || "Unavailable vendor", lines: [] };
    group.lines.push(line);
    groups.set(line.vendorId, group);
  }

  const items = (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([vendorId, group]) => (
        <div key={vendorId} className="rounded-card border border-brand-dark/[0.06] bg-brand-surface p-4 shadow-card">
          <div className="flex items-center justify-between border-b border-brand-dark/10 pb-2 text-sm">
            <span className="flex items-center gap-2 font-heading text-brand-dark">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><Store className="h-3.5 w-3.5" aria-hidden="true" /></span>
              {group.vendorName}
            </span>
            <span className="text-xs text-brand-dark/60">
              Delivery: {(quote.deliveryByVendor[vendorId] ?? 0) === 0 ? "Free" : formatCurrency(quote.deliveryByVendor[vendorId])}
            </span>
          </div>
          <ul className="divide-y divide-brand-dark/10">
            {group.lines.map((line) => {
              const q = quoteByKey.get(line.key)!;
              const personalisation = personalizationSummary(line.personalization);
              return (
                <li key={line.key} className="flex gap-3 py-3 text-sm">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-button border border-brand-dark/10">
                    <ProductImage src={line.imageUrl} alt={line.name} className="h-full w-full" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-dark">{line.name}</p>
                    {line.variantLabels.length > 0 ? <p className="text-xs text-brand-dark/60">{line.variantLabels.join(" · ")}</p> : null}
                    {personalisation ? <p className="text-xs text-brand-dark/60">{personalisation}</p> : null}
                    <p className="text-xs text-brand-dark/50">Qty {line.quantity}</p>
                    {line.issue ? <p className="mt-1 text-xs font-medium text-red-700">{line.issue}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-brand-dark">{formatCurrency(q.gross)}</p>
                    {q.discount > 0 ? <p className="text-xs text-brand-primary">− {formatCurrency(q.discount)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-xs text-brand-dark/50">
        Need to change something? <Link href="/cart" className="underline">Edit your cart</Link>
      </p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Almost there</p>
          <h1 className="mt-2 font-heading text-4xl text-brand-dark">Check<span className="accent-word">out</span></h1>
        </div>
        <CheckoutSteps current={1} />
      </div>
      <CheckoutForm
        addresses={addresses}
        quote={{
          subtotal: quote.subtotal,
          discount: quote.discount,
          delivery: quote.delivery,
          gstTotal: quote.gstTotal,
          totalBeforeWrap: quote.total,
          itemCount: snapshot.lines.reduce((n, l) => n + l.quantity, 0),
          couponCode: snapshot.couponCode,
          couponMessage: snapshot.couponLookupError ?? quote.couponError,
        }}
        giftWrapCharge={snapshot.settings.giftWrapCharge}
        freeDeliveryThreshold={snapshot.settings.freeDeliveryThreshold}
        expressSurcharge={snapshot.settings.expressSurcharge}
        idempotencyKey={randomUUID()}
        returnDays={returnDays}
        blocked={blocked ?? quote.couponError}
        itemsSlot={items}
      />
    </div>
  );
}
