import { caveat } from "@/components/diary/fonts";
import { ENGRAVING_STYLES, displayEngraving, fitFontSize, getEngravingStyle, type EngravingConfig } from "@/lib/personalization/engraving";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

const FX: Record<string, string> = { gold: "gold", deep: "deep", cream: "cream", script: "script" };

/**
 * The shopper's text drawn onto the product photo, at the place and in the style the boutique set up. The parent MUST be `position: relative` with
 * `container-type: inline-size` and a SQUARE frame (the gallery crops every photo to a square, and the placement is stored in percent of that square).
 * With no text it shows a dashed box and a faint sample (`placeholder`) so people can see where theirs will go. Purely visual: aria-hidden, since the
 * same words are in the text field right next to it.
 */
export function EngravingOverlay({ config, text, placeholder, sample = "Your text", className }: { config: EngravingConfig; text: string; placeholder?: boolean; sample?: string; className?: string }) {
  const typed = text.trim();
  if (!typed && !placeholder) return null;
  const shown = displayEngraving(typed || sample, config.style);
  const style = getEngravingStyle(config.style);
  const size = fitFontSize(shown, { w: config.w, h: config.h }, config.style);
  return (
    <div
      aria-hidden="true"
      className={cn(caveat.variable, "gp-engrave", `gp-engrave-font-${style.font}`, `gp-engrave-fx-${FX[style.id] ?? "gold"}`, !typed && "gp-engrave-empty", typed && "gp-engrave-live", className)}
      style={{ left: `${config.x}%`, top: `${config.y}%`, width: `${config.w}%`, height: `${config.h}%`, transform: `rotate(${config.rotate}deg)` }}
    >
      <span className="gp-engrave-text" key={shown.length} style={{ fontSize: `${size}cqw`, letterSpacing: style.spacing }}>{shown}</span>
    </div>
  );
}

export { ENGRAVING_STYLES };
