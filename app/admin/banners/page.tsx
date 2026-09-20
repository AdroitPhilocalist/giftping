import { BannerDialog, type BannerFormValues } from "@/components/admin/BannerDialog";
import { BannerRowActions } from "@/components/admin/BannerRowActions";
import { Badge } from "@/components/ui/Badge";
import { istDate } from "@/lib/admin/coupons";
import { bannerStatus } from "@/lib/content/banners";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Banners — GiftPing Admin" };
const VARIANT = { live: "primary", paused: "neutral", scheduled: "gold", expired: "neutral" } as const;
const AUDIENCE = { all: "Everyone", customer: "Shoppers", vendor: "Vendors only" } as const;

export default async function AdminBannersPage() {
  await requireRole("admin");
  // The admin's own session: RLS (is_admin) lets them see paused/scheduled/expired banners that the public can't.
  const { data: banners } = await (await createClient()).from("banners").select("*").order("sort_order").order("created_at");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Homepage banners</h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            The slides at the top of the homepage, in the order below. Schedule a campaign with start and end dates (India time) and it appears and disappears by itself.
          </p>
        </div>
        <BannerDialog />
      </div>

      {!banners || banners.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No banners yet. Create the first one — the homepage shows its usual welcome until you do.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white">
          {banners.map((b, i) => {
            const status = bannerStatus(b);
            const form: BannerFormValues = {
              id: b.id, headline: b.headline ?? "", subheading: b.subheading ?? "", ctaText: b.cta_text ?? "", ctaUrl: b.cta_url ?? "", altText: b.alt_text ?? "",
              audience: (b.target_audience as BannerFormValues["audience"]) ?? "all", startsOn: istDate(b.starts_at), endsOn: istDate(b.ends_at), isActive: b.is_active,
              imageUrl: b.image_medium_url ?? b.image_url,
            };
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail */}
                <img src={b.image_medium_url ?? b.image_url} alt={b.alt_text ?? b.headline ?? "Banner"} className="h-16 w-36 shrink-0 rounded-lg border border-brand-dark/10 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-dark">
                    {b.headline || <span className="text-brand-dark/50">(image only)</span>} <Badge variant={VARIANT[status]}>{status}</Badge>
                  </p>
                  <p className="text-xs text-brand-dark/60">
                    {[AUDIENCE[b.target_audience as keyof typeof AUDIENCE] ?? b.target_audience, b.starts_at && `from ${istDate(b.starts_at)}`, b.ends_at && `until ${istDate(b.ends_at)}`, b.cta_url && `links to ${b.cta_url}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <BannerDialog initial={form} />
                  <BannerRowActions id={b.id} active={b.is_active} first={i === 0} last={i === banners.length - 1} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
