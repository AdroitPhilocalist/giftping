"use client";

import { useRef } from "react";
import Image from "next/image";
import { EngravingOverlay } from "@/components/shop/EngravingOverlay";
import { ENGRAVING_LIMITS, clampPlacement, type EngravingConfig, type EngravingPlacement } from "@/lib/personalization/engraving";
import { Label } from "@/components/ui/Input";

type Drag = { mode: "move" | "resize"; startX: number; startY: number; orig: EngravingPlacement };

/**
 * Where the shopper's text appears on the product photo. The boutique DRAGS a box on their own photo (or nudges it with the arrow keys / the fine-tune
 * sliders — the keyboard-and-screen-reader route), and sees the text rendered exactly as shoppers will: this uses the very same EngravingOverlay, in the same
 * SQUARE frame the product page uses (the gallery crops engravable products to a square at every screen size, so positions mean the same thing everywhere).
 * Everything is stored as a percentage of that square.
 */
export function EngravingPlacementEditor({ imageUrl, config, sample, onChange }: { imageUrl: string; config: EngravingConfig; sample: string; onChange: (placement: EngravingPlacement) => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const place: EngravingPlacement = { x: config.x, y: config.y, w: config.w, h: config.h, rotate: config.rotate };

  function begin(e: React.PointerEvent, mode: Drag["mode"]) {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId); // keeps the drag going if the pointer leaves the box; not worth failing over where unsupported
    } catch {
      /* the drag still works while the pointer stays over the frame */
    }
    drag.current = { mode, startX: e.clientX, startY: e.clientY, orig: place };
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    const rect = frameRef.current?.getBoundingClientRect();
    if (!d || !rect || rect.width === 0) return;
    const dx = ((e.clientX - d.startX) / rect.width) * 100;
    const dy = ((e.clientY - d.startY) / rect.height) * 100;
    // Moving slides the box (clamped to stay on the photo). Resizing keeps the top-left corner where it is and simply stops at the photo's right/bottom edge —
    // it must never push the box sideways to make room.
    onChange(
      clampPlacement(
        d.mode === "move"
          ? { ...d.orig, x: d.orig.x + dx, y: d.orig.y + dy }
          : { ...d.orig, w: Math.min(d.orig.w + dx, 100 - d.orig.x), h: Math.min(d.orig.h + dy, 100 - d.orig.y) },
      ),
    );
  }

  function end(e: React.PointerEvent) {
    drag.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* nothing to release */
    }
  }

  function key(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 5 : 1;
    const delta: Partial<Record<string, EngravingPlacement>> = {
      ArrowLeft: { ...place, x: place.x - step },
      ArrowRight: { ...place, x: place.x + step },
      ArrowUp: { ...place, y: place.y - step },
      ArrowDown: { ...place, y: place.y + step },
      "+": { ...place, w: place.w + step * 2 },
      "=": { ...place, w: place.w + step * 2 },
      "-": { ...place, w: place.w - step * 2 },
    };
    const next = delta[e.key];
    if (!next) return;
    e.preventDefault();
    onChange(clampPlacement(next));
  }

  const slider = (id: string, label: string, value: number, min: number, max: number, set: (n: number) => EngravingPlacement) => (
    <div>
      <Label htmlFor={id}>{label} <span className="font-normal text-brand-dark/50">({Math.round(value * 10) / 10})</span></Label>
      <input id={id} type="range" min={min} max={max} step={0.5} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(clampPlacement(set(Number(e.target.value))))} className="w-full accent-brand-primary" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div ref={frameRef} className="relative aspect-square w-full max-w-md overflow-hidden rounded-card border border-brand-dark/15 bg-brand-accent/40 shadow-card" style={{ containerType: "inline-size" }}>
        <Image src={imageUrl} alt="" fill sizes="448px" className="object-cover" />
        <EngravingOverlay config={config} text={sample} placeholder sample="Aarav Nair" />
        {/* the grab box: invisible to the shopper-facing page, here it is the handle */}
        <div
          role="group"
          tabIndex={0}
          aria-label="Text position. Drag to move it, or use the arrow keys; plus and minus change the width."
          onPointerDown={(e) => begin(e, "move")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onKeyDown={key}
          className="absolute cursor-move touch-none rounded-sm border-2 border-brand-secondary bg-brand-secondary/10 outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
          style={{ left: `${place.x}%`, top: `${place.y}%`, width: `${place.w}%`, height: `${place.h}%`, transform: `rotate(${place.rotate}deg)` }}
        >
          <span
            aria-hidden="true"
            onPointerDown={(e) => begin(e, "resize")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            className="absolute -bottom-2.5 -right-2.5 h-5 w-5 cursor-nwse-resize touch-none rounded-full border-2 border-brand-surface bg-brand-secondary shadow-card"
          />
        </div>
      </div>
      <p className="text-xs text-brand-dark/60">Drag the box to where the text should go; drag the round handle to resize it. This is the crop shoppers see.</p>

      <details className="rounded-button border border-brand-dark/10 bg-brand-surface p-3 text-sm">
        <summary className="cursor-pointer font-medium text-brand-dark">Fine-tune with sliders</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {slider("eng-x", "Left", place.x, 0, 100 - place.w, (n) => ({ ...place, x: n }))}
          {slider("eng-y", "Top", place.y, 0, 100 - place.h, (n) => ({ ...place, y: n }))}
          {slider("eng-w", "Width", place.w, ENGRAVING_LIMITS.minW, 100 - place.x, (n) => ({ ...place, w: n }))}
          {slider("eng-h", "Height", place.h, ENGRAVING_LIMITS.minH, 100 - place.y, (n) => ({ ...place, h: n }))}
          {slider("eng-r", "Tilt (degrees)", place.rotate, -ENGRAVING_LIMITS.maxRotate, ENGRAVING_LIMITS.maxRotate, (n) => ({ ...place, rotate: n }))}
        </div>
      </details>
    </div>
  );
}
