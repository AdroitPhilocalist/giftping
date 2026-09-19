const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Whole rupees stay clean (₹1,499); anything with paise shows them (₹949.05) so totals never silently round. */
export function formatCurrency(amount: number): string {
  return Number.isInteger(amount) ? inrWhole.format(amount) : inrPaise.format(amount);
}
