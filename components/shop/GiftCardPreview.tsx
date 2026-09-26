import { Heart } from "lucide-react";
import { caveat } from "@/components/diary/fonts";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

/**
 * "This is how your note will look": the message written by hand on a small card tucked into the gift, updating as the shopper types. Purely a preview —
 * what is saved is the plain text — but seeing it makes the personal note feel like a real thing being made.
 */
export function GiftCardPreview({ recipient, message, className }: { recipient: string; message: string; className?: string }) {
  const to = recipient.trim();
  const note = message.trim();
  return (
    <figure className={cn(caveat.variable, "gift-card", className)} aria-label="Preview of your gift card">
      <span className="gift-card-tape" aria-hidden="true" />
      <div className="gift-card-paper">
        {to ? <p className="gift-card-to">Dear {to},</p> : null}
        <p className={cn("gift-card-body", !note && "gift-card-empty")}>{note || "Your message will appear here, written just for them…"}</p>
        <p className="gift-card-sign">
          With love <Heart className="inline h-[0.8em] w-[0.8em] fill-current text-brand-secondary" aria-hidden="true" />
        </p>
      </div>
    </figure>
  );
}
