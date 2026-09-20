import { addDays, localDateIn, type ISODate } from "../diary/recurrence";

/**
 * Dashboard aggregation — pure and unit-tested. Input is PAID orders (the caller filters); "revenue" here is GMV: what customers paid, GST-inclusive.
 * Platform earnings are the commission on those lines. Days are IST calendar days.
 */
export interface StatsOrder {
  id: string;
  total_amount: number | string;
  placed_at: string;
  items: {
    product_id: string | null;
    product_name: string;
    vendor_id: string;
    vendor_name: string;
    quantity: number;
    total_price: number | string;
    discount_amount: number | string;
    commission_amount: number | string;
  }[];
}

export interface Ranked {
  id: string;
  name: string;
  revenue: number;
  units: number;
}

export interface DashboardStats {
  orders: number;
  gmv: number;
  aov: number;
  commission: number;
  unitsSold: number;
  topProducts: Ranked[];
  topVendors: Ranked[];
  daily: { date: ISODate; gmv: number; orders: number }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function summariseOrders(orders: StatsOrder[], range: { days: number; today: ISODate }): DashboardStats {
  const products = new Map<string, Ranked>();
  const vendors = new Map<string, Ranked>();
  const daily = new Map<ISODate, { gmv: number; orders: number }>();
  for (let i = range.days - 1; i >= 0; i--) daily.set(addDays(range.today, -i), { gmv: 0, orders: 0 });

  let gmv = 0, commission = 0, unitsSold = 0;
  for (const order of orders) {
    const total = Number(order.total_amount);
    gmv += total;
    const day = daily.get(localDateIn("Asia/Kolkata", new Date(order.placed_at)));
    if (day) { day.gmv += total; day.orders += 1; }

    for (const item of order.items) {
      const net = Number(item.total_price) - Number(item.discount_amount);
      commission += Number(item.commission_amount);
      unitsSold += item.quantity;
      const pKey = item.product_id ?? item.product_name;
      const p = products.get(pKey) ?? { id: pKey, name: item.product_name, revenue: 0, units: 0 };
      p.revenue += net; p.units += item.quantity; products.set(pKey, p);
      const v = vendors.get(item.vendor_id) ?? { id: item.vendor_id, name: item.vendor_name, revenue: 0, units: 0 };
      v.revenue += net; v.units += item.quantity; vendors.set(item.vendor_id, v);
    }
  }

  const rank = (m: Map<string, Ranked>) =>
    [...m.values()].map((x) => ({ ...x, revenue: r2(x.revenue) })).sort((a, b) => b.revenue - a.revenue || b.units - a.units || a.name.localeCompare(b.name)).slice(0, 5);

  return {
    orders: orders.length,
    gmv: r2(gmv),
    aov: orders.length ? r2(gmv / orders.length) : 0,
    commission: r2(commission),
    unitsSold,
    topProducts: rank(products),
    topVendors: rank(vendors),
    daily: [...daily.entries()].map(([date, d]) => ({ date, gmv: r2(d.gmv), orders: d.orders })),
  };
}
