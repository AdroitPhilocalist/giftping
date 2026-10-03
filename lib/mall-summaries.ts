import "server-only";
import { getApprovedVendors } from "@/lib/db/vendors";
import { getTrendingProducts, listProducts } from "@/lib/db/products";
import { MALL_ZONES } from "@/lib/mall";

/** What the map's place card shows for a place: a headline figure and up to three real things to look at. Only plain data, so it can cross to the client. */
export interface PlaceSummary {
  label: string;
  items: { id: string; name: string; href: string; image: string | null }[];
}

const ITEMS = 3;

/**
 * The live contents of each place on the mall map. Every place is real: a category (the same listing its page shows), the boutique
 * list, or the signature picks. A place that can't be read is simply left out — the card then shows only its name, never an error.
 */
export async function getPlaceSummaries(): Promise<Record<string, PlaceSummary>> {
  const out: Record<string, PlaceSummary> = {};
  await Promise.all(
    MALL_ZONES.map(async (zone) => {
      try {
        if (zone.id === "boutiques") {
          const vendors = await getApprovedVendors();
          out[zone.id] = {
            label: `${vendors.length} ${vendors.length === 1 ? "boutique" : "boutiques"}`,
            items: vendors.slice(0, ITEMS).map((v) => ({ id: v.id, name: v.business_name, href: `/vendors/${v.slug}`, image: v.logo_url })),
          };
        } else if (zone.id === "atrium") {
          const top = await getTrendingProducts(ITEMS);
          out[zone.id] = { label: "Our signature picks", items: top.map((p) => ({ id: p.id, name: p.name, href: `/products/${p.slug}`, image: p.thumbnail_url })) };
        } else if (zone.href.startsWith("/categories/")) {
          const slug = zone.href.slice("/categories/".length);
          const { products, total } = await listProducts({ categorySlug: slug, pageSize: ITEMS });
          out[zone.id] = { label: `${total} ${total === 1 ? "gift" : "gifts"}`, items: products.map((p) => ({ id: p.id, name: p.name, href: `/products/${p.slug}`, image: p.thumbnail_url })) };
        }
      } catch {
        /* leave this place without a summary */
      }
    }),
  );
  return out;
}
