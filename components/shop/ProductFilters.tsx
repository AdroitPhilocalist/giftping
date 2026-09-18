import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

export interface VendorOption {
  slug: string;
  business_name: string;
}

const OCCASION_OPTIONS = ["birthday", "anniversary", "wedding", "housewarming", "thank-you"];
const RECIPIENT_OPTIONS = ["for-her", "for-him", "for-parents", "for-kids", "for-colleagues"];

/**
 * A plain GET form — filters are query params, so results are server-rendered and the whole
 * thing works without JS. Full drawer/animated polish is a Stage 12 concern; this stage is
 * about the filtering actually working correctly.
 */
export function ProductFilters({
  vendors,
  current,
}: {
  vendors: VendorOption[];
  current: {
    vendor?: string;
    occasion?: string;
    recipient?: string;
    sort?: string;
    inStock?: string;
  };
}) {
  return (
    <form method="get" className="space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-5">
      <h2 className="font-heading text-base text-brand-dark">Filter & Sort</h2>

      {vendors.length > 0 ? (
        <div>
          <label htmlFor="vendor" className="mb-1 block text-xs font-medium text-brand-dark/60">
            Vendor
          </label>
          <Select id="vendor" name="vendor" defaultValue={current.vendor ?? ""}>
            <option value="">All Vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.slug} value={vendor.slug}>
                {vendor.business_name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div>
        <label htmlFor="occasion" className="mb-1 block text-xs font-medium text-brand-dark/60">
          Occasion
        </label>
        <Select id="occasion" name="occasion" defaultValue={current.occasion ?? ""}>
          <option value="">Any Occasion</option>
          {OCCASION_OPTIONS.map((tag) => (
            <option key={tag} value={tag} className="capitalize">
              {tag.replace("-", " ")}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="recipient" className="mb-1 block text-xs font-medium text-brand-dark/60">
          Recipient
        </label>
        <Select id="recipient" name="recipient" defaultValue={current.recipient ?? ""}>
          <option value="">Anyone</option>
          {RECIPIENT_OPTIONS.map((tag) => (
            <option key={tag} value={tag}>
              {tag.replace("for-", "For ").replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="sort" className="mb-1 block text-xs font-medium text-brand-dark/60">
          Sort By
        </label>
        <Select id="sort" name="sort" defaultValue={current.sort ?? "popularity"}>
          <option value="popularity">Popularity</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="newest">Newest</option>
          <option value="rating">Highest Rated</option>
        </Select>
      </div>

      <label className="flex items-center gap-2 text-sm text-brand-dark/70">
        <input
          type="checkbox"
          name="inStock"
          value="true"
          defaultChecked={current.inStock === "true"}
          className="h-4 w-4 rounded border-brand-dark/20 text-brand-primary focus:ring-brand-secondary"
        />
        In stock only
      </label>

      <Button type="submit" size="sm" className="w-full">
        Apply Filters
      </Button>
    </form>
  );
}
