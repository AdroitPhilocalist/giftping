/** Turns a courier's "N days" into the sentence shoppers read. Pure and tested; `today` is injectable so the tests don't depend on the clock. */
export function describeDelivery(args: { status: "ok" | "unserviceable" | "unknown"; etdDays: number | null; pincode: string; today?: Date }): { tone: "good" | "bad" | "neutral"; text: string } {
  const { status, etdDays, pincode } = args;
  if (status === "unserviceable") return { tone: "bad", text: `Sorry — this boutique can't deliver to ${pincode} yet.` };
  if (status === "ok") {
    if (etdDays && etdDays > 0 && etdDays < 30) {
      const date = new Date((args.today ?? new Date()).getTime() + etdDays * 86_400_000);
      const label = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
      return { tone: "good", text: `Delivers to ${pincode} in about ${etdDays} ${etdDays === 1 ? "day" : "days"} — expected by ${label}.` };
    }
    return { tone: "good", text: `Yes — we deliver to ${pincode}.` };
  }
  return { tone: "neutral", text: `We'll confirm the delivery date for ${pincode} at checkout.` };
}
