import { CouponDialog, type CouponFormValues } from "@/components/admin/CouponDialog";
import { CouponRowActions } from "@/components/admin/CouponRowActions";
import { Badge } from "@/components/ui/Badge";
import { couponStatus, describeCoupon, istDate } from "@/lib/admin/coupons";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Coupons — GiftPing Admin" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const VARIANT = { active: "primary", paused: "neutral", scheduled: "gold", expired: "neutral", exhausted: "neutral" } as const;

export default async function AdminCouponsPage() {
  // The admin's own session: RLS (is_admin) decides what's visible — coupons are otherwise unlistable by customers.
  const supabase = await createClient();
  const [{ data: coupons }, { data: vendors }, { data: categories }] = await Promise.all([
    supabase.from("coupons").select("*, vendor:vendors ( business_name ), category:categories ( name )").order("created_at", { ascending: false }),
    supabase.from("vendors").select("id, business_name").eq("status", "approved").order("business_name"),
    supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  const vendorOptions = (vendors ?? []).map((v) => ({ id: v.id, name: v.business_name }));
  const categoryOptions = categories ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Coupons</h1>
          <p className="mt-1 text-sm text-brand-dark/60">Codes customers enter at checkout. Discounts on a boutique-scoped coupon are paid for by that boutique; platform-wide ones by GiftPing.</p>
        </div>
        <CouponDialog vendors={vendorOptions} categories={categoryOptions} />
      </div>

      {!coupons || coupons.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No coupons yet. Create the first one — try a welcome offer.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white">
          {coupons.map((c) => {
            const status = couponStatus(c);
            const form: CouponFormValues = {
              id: c.id, code: c.code, description: c.description ?? "", discountType: c.discount_type as "percentage" | "fixed", discountValue: String(Number(c.discount_value)),
              minOrderAmount: Number(c.min_order_amount) ? String(Number(c.min_order_amount)) : "", maxDiscountAmount: c.max_discount_amount ? String(Number(c.max_discount_amount)) : "",
              usageLimit: c.usage_limit ? String(c.usage_limit) : "", perUserLimit: String(c.per_user_limit), vendorId: c.vendor_id ?? "", categoryId: c.category_id ?? "",
              validFrom: istDate(c.valid_from), validUntil: istDate(c.valid_until), isActive: c.is_active, used: c.used_count > 0,
            };
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-mono text-sm font-semibold text-brand-dark">{c.code} <Badge variant={VARIANT[status]}>{status}</Badge></p>
                  <p className="text-sm text-brand-dark/70">{describeCoupon(c)}</p>
                  <p className="text-xs text-brand-dark/50">
                    {[one(c.vendor)?.business_name && `only ${one(c.vendor)!.business_name}`, one(c.category)?.name && `only ${one(c.category)!.name}`, c.valid_until && `until ${istDate(c.valid_until)}`, `${c.per_user_limit}/customer`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <span className="text-brand-dark/70">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""} used</span>
                  <CouponDialog initial={form} vendors={vendorOptions} categories={categoryOptions} />
                  <CouponRowActions id={c.id} active={c.is_active} used={c.used_count > 0} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
