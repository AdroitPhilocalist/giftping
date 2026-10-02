import { BroadcastVendorMessage } from "@/components/admin/BroadcastVendorMessage";
import { DecisionButtons } from "@/components/admin/DecisionButtons";
import { VendorAdminControls } from "@/components/admin/VendorAdminControls";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/db/server";
import { requireRole } from "@/lib/auth/session";

export default async function AdminVendorsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("*, details:vendor_private(*)")
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });

  const rows = vendors ?? [];
  const pending = rows.filter((v) => v.status === "pending");
  const decided = rows.filter((v) => v.status !== "pending");
  const approvedCount = rows.filter((v) => v.status === "approved").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-brand-dark">Vendors</h1>
        {approvedCount > 0 ? <BroadcastVendorMessage vendorCount={approvedCount} /> : null}
      </div>

      <h2 className="mb-3 mt-6 font-heading text-lg text-brand-dark">Pending applications ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-dark/15 p-8 text-center text-sm text-brand-dark/50">Nothing waiting for review.</p>
      ) : (
        <div className="space-y-4">
          {pending.map((vendor) => {
            const d = Array.isArray(vendor.details) ? vendor.details[0] : vendor.details;
            const address = d?.warehouse_address as { line1?: string; city?: string; state?: string; pincode?: string } | null;
            return (
              <Card key={vendor.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-heading text-xl text-brand-dark">{vendor.business_name}</p>
                    <p className="text-xs text-brand-dark/50">{vendor.business_type} · {vendor.support_email} · {vendor.support_phone}</p>
                  </div>
                  <DecisionButtons kind="vendor" id={vendor.id} />
                </div>
                <p className="mt-3 text-sm text-brand-dark/70">{vendor.description}</p>
                <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs text-brand-dark/70 sm:grid-cols-2">
                  <div><dt className="inline text-brand-dark/40">GSTIN: </dt><dd className="inline">{d?.gstin}</dd></div>
                  <div><dt className="inline text-brand-dark/40">PAN: </dt><dd className="inline">{d?.pan}</dd></div>
                  <div><dt className="inline text-brand-dark/40">Bank: </dt><dd className="inline">{d?.bank_account_name} · ••••{d?.bank_account_last4} · {d?.bank_ifsc}</dd></div>
                  <div><dt className="inline text-brand-dark/40">Pickup: </dt><dd className="inline">{address ? `${address.line1}, ${address.city}, ${address.state} ${address.pincode}` : "—"}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-heading text-lg text-brand-dark">Decided ({decided.length})</h2>
      <ul className="divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-brand-surface">
        {decided.map((vendor) => {
          const d = Array.isArray(vendor.details) ? vendor.details[0] : vendor.details;
          const wh = d?.warehouse_address as { city?: string; pincode?: string } | null;
          return (
            <li key={vendor.id} className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-brand-dark">{vendor.business_name}</span>
                <Badge variant={vendor.status === "approved" ? "primary" : vendor.status === "suspended" ? "gold" : "neutral"}>{vendor.status}</Badge>
              </div>
              <p className="text-xs text-brand-dark/50">
                {vendor.support_email ?? "no email"} · {vendor.support_phone ?? "no phone"} · pickup {wh?.pincode ? `${wh.city ?? ""} ${wh.pincode}` : "not set"} · commission {d?.commission_rate == null ? "default" : `${Number(d.commission_rate)}% (override)`}
              </p>
              {vendor.status === "approved" || vendor.status === "suspended" ? (
                <VendorAdminControls vendorId={vendor.id} name={vendor.business_name} status={vendor.status} commissionOverride={d?.commission_rate == null ? null : Number(d.commission_rate)} hasLogo={Boolean(vendor.logo_url)} hasBanner={Boolean(vendor.banner_url)} isFeatured={Boolean(vendor.is_featured)} />
              ) : null}
            </li>
          );
        })}
        {decided.length === 0 ? <li className="p-4 text-sm text-brand-dark/50">None yet.</li> : null}
      </ul>
    </div>
  );
}
