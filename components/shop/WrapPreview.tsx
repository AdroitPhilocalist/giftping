import Image from "next/image";
import { Gift } from "lucide-react";
import { GiftCardPreview } from "@/components/shop/GiftCardPreview";
import { WRAP_STYLES, type WrapStyleId } from "@/lib/commerce/wrap-styles";
import { siteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

/**
 * "This is how it will arrive": the wrap the shopper picked, big, with the handwritten card tucked into it showing THEIR message addressed to the real
 * recipient. All five wrap pictures stay mounted and cross-fade as the choice changes (the new one gives a small re-tie pop), so switching feels like
 * re-dressing the same gift. Purely a preview — what is saved is the wrap id and the plain message text; the card is cosmetic, like the wrap itself.
 */
export function WrapPreview({ wrapStyle, message, recipient, className }: { wrapStyle: WrapStyleId; message: string; recipient: string; className?: string }) {
  const active = WRAP_STYLES.find((w) => w.id === wrapStyle) ?? WRAP_STYLES[0];
  return (
    <figure className={cn("mx-auto w-full max-w-sm", className)} aria-label={`Preview: your gift in ${active.label} wrapping`}>
      <div className="relative aspect-square overflow-hidden rounded-card border border-brand-dark/10 bg-gradient-to-b from-brand-accent/60 to-brand-surface shadow-card">
        {WRAP_STYLES.map((w) => {
          const img = siteImage(w.imageKey);
          const on = w.id === active.id;
          return img ? (
            <Image
              key={w.id}
              src={img.src}
              alt=""
              fill
              sizes="(min-width: 640px) 384px, 90vw"
              className={cn("object-contain p-4 transition-opacity duration-500 ease-out", on ? "gp-wrap-pop opacity-100" : "pointer-events-none opacity-0")}
              aria-hidden={on ? undefined : true}
            />
          ) : on ? (
            <Gift key={w.id} className="absolute inset-0 m-auto h-1/3 w-1/3 text-brand-secondary" aria-hidden="true" />
          ) : null;
        })}
        {/* the card tucked into the ribbon; keyed on the style so it swings in again whenever the wrap changes */}
        <GiftCardPreview key={active.id} recipient={recipient} message={message} className="gp-wrap-card absolute -bottom-1 -right-1 w-[56%]" />
      </div>
      <figcaption className="mt-2 text-center text-xs text-brand-dark/60">{active.label} — {active.detail}</figcaption>
    </figure>
  );
}
