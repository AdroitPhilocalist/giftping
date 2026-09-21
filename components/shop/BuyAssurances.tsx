import { Gift, RotateCcw, ShieldCheck } from "lucide-react";

/** The three reassurances beside the pay button. Only claims the site really keeps: secure gateway payment, the configured return window, optional gift wrap. */
export function BuyAssurances({ returnDays }: { returnDays: number }) {
  const items = [
    { icon: ShieldCheck, text: "Secure payment — UPI, cards and netbanking" },
    { icon: RotateCcw, text: returnDays > 0 ? `${returnDays}-day returns on delivered items` : "Returns handled from your order page" },
    { icon: Gift, text: "Gift wrap and a personal note, if you like" },
  ];
  return (
    <ul className="space-y-2.5 border-t border-brand-dark/10 pt-4 text-xs text-brand-dark/65">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-2.5">
          <Icon className="mt-px h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}
