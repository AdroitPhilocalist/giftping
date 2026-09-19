import { ProductForm } from "@/components/vendor/ProductForm";
import { getActiveCategoryOptions, requireApprovedVendor } from "@/lib/db/vendor-portal";

export default async function NewProductPage() {
  await requireApprovedVendor();
  const categories = await getActiveCategoryOptions();

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Add a product</h1>
      <p className="mb-6 mt-1 text-sm text-brand-dark/60">Save the details first — you&apos;ll add photos on the next screen.</p>
      <ProductForm productId={null} categories={categories} />
    </div>
  );
}
