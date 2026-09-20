import { VendorSettingsForm } from "@/components/vendor/VendorSettingsForm";
import { requireApprovedVendor } from "@/lib/db/vendor-portal";

export const metadata = { title: "Settings — GiftPing Vendor" };

export default async function VendorSettingsPage() {
  const { vendor } = await requireApprovedVendor();
  const d = Array.isArray(vendor.details) ? vendor.details[0] : vendor.details;
  const wh = (d?.warehouse_address ?? {}) as { line1?: string; city?: string; state?: string; pincode?: string };
  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Settings</h1>
      <p className="mt-1 mb-6 text-sm text-brand-dark/60">Your commission, bank account and legal details are managed by GiftPing — contact support to change them.</p>
      <VendorSettingsForm
        initial={{
          shortDescription: vendor.short_description ?? "",
          description: vendor.description ?? "",
          supportEmail: vendor.support_email ?? "",
          supportPhone: vendor.support_phone ?? "",
          warehouseLine1: wh.line1 ?? "",
          warehouseCity: wh.city ?? "",
          warehouseState: wh.state ?? "",
          warehousePincode: wh.pincode ?? "",
        }}
      />
    </div>
  );
}
