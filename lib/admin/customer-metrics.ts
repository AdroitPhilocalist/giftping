import { addDays, localDateIn, type ISODate } from "../diary/recurrence";

/**
 * Customer-growth and repeat-purchase metrics for the admin dashboard — pure and unit-tested.
 * Inputs are plain rows (the caller filters): customers = accounts with role "customer", orders = PAID orders only
 * (all-time, so "repeat" can see a customer's earlier purchases from before the window). Days are IST calendar days.
 */
export interface MetricsCustomer {
  id: string;
  created_at: string;
}
export interface MetricsOrder {
  customer_id: string;
  placed_at: string;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  /** one entry per day of the window, oldest first, zero-filled */
  dailySignups: { date: ISODate; count: number }[];
  /** customers who have ever placed a paid order */
  buyers: number;
  /** buyers with two or more paid orders, all-time */
  repeatBuyers: number;
  /** repeatBuyers / buyers, 0..1 (0 when there are no buyers) */
  repeatRate: number;
  /** paid orders per buyer, all-time */
  ordersPerBuyer: number;
  /** paid orders placed inside the window */
  periodOrders: number;
  /** of those, orders from a customer who had already bought before that order */
  returningOrders: number;
  /** returningOrders / periodOrders, 0..1 */
  returningShare: number;
  /** customers who signed up inside the window, and how many of them have already bought */
  newCustomersWhoBought: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const ratio = (n: number, d: number) => (d > 0 ? n / d : 0);

export function summariseCustomers(
  customers: MetricsCustomer[],
  orders: MetricsOrder[],
  range: { days: number; today: ISODate },
  /** customers that exist but weren't loaded (row cap) — added to the headline total only */
  extraCustomers = 0,
): CustomerMetrics {
  const first = addDays(range.today, -(range.days - 1));
  const day = (iso: string) => localDateIn("Asia/Kolkata", new Date(iso));

  const signups = new Map<ISODate, number>();
  for (let i = range.days - 1; i >= 0; i--) signups.set(addDays(range.today, -i), 0);
  let newCustomers = 0;
  const newIds: string[] = [];
  for (const c of customers) {
    const d = day(c.created_at);
    if (d >= first && d <= range.today) {
      newCustomers += 1;
      newIds.push(c.id);
      signups.set(d, (signups.get(d) ?? 0) + 1);
    }
  }

  // Walk each customer's orders oldest-first so "had they bought before this order?" is simply "is this their first".
  const sorted = [...orders].sort((a, b) => Date.parse(a.placed_at) - Date.parse(b.placed_at));
  const seen = new Map<string, number>();
  let periodOrders = 0, returningOrders = 0;
  for (const o of sorted) {
    const before = seen.get(o.customer_id) ?? 0;
    const d = day(o.placed_at);
    if (d >= first && d <= range.today) {
      periodOrders += 1;
      if (before > 0) returningOrders += 1;
    }
    seen.set(o.customer_id, before + 1);
  }

  const buyers = seen.size;
  let repeatBuyers = 0;
  for (const n of seen.values()) if (n >= 2) repeatBuyers += 1;

  const newCustomersWhoBought = newIds.filter((id) => seen.has(id)).length;

  return {
    totalCustomers: customers.length + extraCustomers,
    newCustomers,
    dailySignups: [...signups].map(([date, count]) => ({ date, count })),
    buyers,
    repeatBuyers,
    repeatRate: r2(ratio(repeatBuyers, buyers)),
    ordersPerBuyer: r2(ratio(orders.length, buyers)),
    periodOrders,
    returningOrders,
    returningShare: r2(ratio(returningOrders, periodOrders)),
    newCustomersWhoBought,
  };
}
