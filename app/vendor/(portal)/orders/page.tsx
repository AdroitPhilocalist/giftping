import { Badge } from "@/components/ui/Badge";
import { getVendorOrderItems, requireApprovedVendor } from "@/lib/db/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

export default async function VendorOrdersPage() {
  const { vendor } = await requireApprovedVendor();
  const items = await getVendorOrderItems(vendor.id);

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Orders</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Orders containing your products appear here once checkout goes live. Confirming and dispatching
        orders arrives with the delivery stage.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
          No orders yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-white">
          {items.map((item) => {
            const order = Array.isArray(item.order) ? item.order[0] : item.order;
            return (
              <li key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-medium text-brand-dark">
                    {item.product_name} × {item.quantity}
                  </p>
                  <p className="text-xs text-brand-dark/50">Order {order?.order_number}</p>
                </div>
                <span>{formatCurrency(item.total_price)}</span>
                <Badge>{item.fulfilment_status}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
