import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { CheckoutForm } from "@/components/shop/CheckoutForm";
import { ProductImage } from "@/components/shop/ProductImage";
import { getServerUser } from "@/lib/auth/session";
import { loadCheckoutSnapshot, quoteFor } from "@/lib/commerce/checkout";
import { getAddresses } from "@/lib/db/addresses";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Checkout — GiftPing" };

export default async function CheckoutPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in?redirectTo=/checkout"); // proxy.ts normally gets there first

  const [snapshot, addresses] = await Promise.all([loadCheckoutSnapshot(user.id), getAddresses(user.id)]);
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
        <div key={vendorId} className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
          <div className="flex items-center justify-between border-b border-brand-dark/10 pb-2 text-sm">
            <span className="flex items-center gap-2 font-heading text-brand-dark">
              <Store className="h-4 w-4 text-brand-secondary-dark" />
              {group.vendorName}
            </span>
            <span className="text-xs text-brand-dark/60">
              Delivery: {(quote.deliveryByVendor[vendorId] ?? 0) === 0 ? "Free" : formatCurrency(quote.deliveryByVendor[vendorId])}
            </span>
          </div>
          <ul className="divide-y divide-brand-dark/10">
            {group.lines.map((line) => {
              const q = quoteByKey.get(line.key)!;
              const { recipientName, giftMessage, occasion } = line.personalization;
              return (
                <li key={line.key} className="flex gap-3 py-3 text-sm">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-dark/10">
                    <ProductImage src={line.imageUrl} alt={line.name} className="h-full w-full" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-brand-dark">{line.name}</p>
                    {line.variantLabels.length > 0 ? <p className="text-xs text-brand-dark/60">{line.variantLabels.join(" · ")}</p> : null}
                    {recipientName || occasion || giftMessage ? (
                      <p className="text-xs text-brand-dark/60">
                        {[recipientName && `For ${recipientName}`, occasion, giftMessage && `“${giftMessage}”`].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
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
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-brand-dark">Checkout</h1>
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
        idempotencyKey={randomUUID()}
        blocked={blocked ?? quote.couponError}
        itemsSlot={items}
      />
    </div>
  );
}
