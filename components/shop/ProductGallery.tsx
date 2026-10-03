"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { EngravingOverlay } from "@/components/shop/EngravingOverlay";
import { usePersonalizationPreview } from "@/components/shop/PersonalizationPreview";
import type { EngravingConfig } from "@/lib/personalization/engraving";
import { cn } from "@/lib/utils/cn";

export interface GalleryImage {
  url: string;
  alt_text: string | null;
}

/**
 * The product gallery: a large image with previous/next, thumbnails down the side (along the bottom on phones), a zoom view, keyboard arrows and swipe.
 * With no photos it shows a drawn gift rather than an empty box.
 */
export function ProductGallery({ images, productName, engraving }: { images: GalleryImage[]; productName: string; /** the product's live-engraving setup, if it has one — drawn on the MAIN (first) photo */ engraving?: EngravingConfig | null }) {
  const [index, setIndex] = useState(0);
  const preview = usePersonalizationPreview();
  // When the shopper starts typing their text, jump to the photo it appears on ("adjust state when a value changes", compared during render).
  const [seenTick, setSeenTick] = useState(preview?.focusTick ?? 0);
  if (preview && preview.focusTick !== seenTick) {
    setSeenTick(preview.focusTick);
    setIndex(0);
  }
  const [zoom, setZoom] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const count = images.length;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  };

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-card bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent shadow-card">
        <GiftBoxArt tone="green" className="w-1/3" title={`${productName} (photo coming soon)`} />
      </div>
    );
  }

  const active = images[index];
  const showEngravingZoomed = Boolean(engraving && preview && index === 0);
  const arrow = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-brand-surface/95 text-brand-dark shadow-card transition-all duration-300 hover:scale-105 hover:bg-brand-surface";

  return (
    <div className={cn("grid gap-3 lg:gap-4", count > 1 && "lg:grid-cols-[5rem_minmax(0,1fr)]")}>
      <div
        className={cn("relative aspect-square overflow-hidden rounded-card bg-brand-accent/40 shadow-card outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary lg:order-2", !engraving && "sm:aspect-[5/4] lg:aspect-[6/5]")}
        tabIndex={0}
        onKeyDown={onKey}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
          setTouchX(null);
        }}
        aria-roledescription="carousel"
        aria-label={`${productName} photos`}
        style={engraving ? { containerType: "inline-size" } : undefined}
      >
        <Image key={active.url} src={active.url} alt={active.alt_text ?? productName} fill sizes="(min-width: 1024px) 48vw, 100vw" className="animate-[gp-fade_0.5s_ease-out] object-cover" priority />
        {engraving && preview && index === 0 ? <EngravingOverlay config={engraving} text={preview.text} placeholder /> : null}
        {count > 1 ? (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className={cn(arrow, "left-3")}><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" aria-label="Next photo" onClick={() => go(1)} className={cn(arrow, "right-3")}><ChevronRight className="h-5 w-5" /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-brand-primary-dark/70 px-2.5 py-1 text-xs font-medium text-brand-on-primary backdrop-blur" aria-live="polite">{index + 1} / {count}</span>
          </>
        ) : null}
        <button type="button" onClick={() => setZoom(true)} className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-brand-surface/95 px-3.5 py-2 text-xs font-medium text-brand-dark shadow-card transition-all duration-300 hover:bg-brand-surface">
          <ZoomIn className="h-4 w-4" aria-hidden="true" /> Zoom
        </button>
      </div>

      {count > 1 ? (
        <ul className="flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:max-h-[30rem] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0" aria-label="Choose a photo">
          {images.map((image, i) => (
            <li key={image.url + i} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn("relative block h-16 w-16 overflow-hidden rounded-button border-2 transition-all duration-300 lg:h-20 lg:w-20", i === index ? "border-brand-secondary shadow-card" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Dialog.Root open={zoom} onOpenChange={setZoom}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-primary-dark/85 backdrop-blur-sm" />
          <Dialog.Content aria-describedby={undefined} onKeyDown={onKey} className="fixed inset-0 z-50 flex items-center justify-center p-4 focus:outline-none sm:p-10">
            <Dialog.Title className="sr-only">{productName} — zoomed photo</Dialog.Title>
            {/* With an engraving to show, the zoom view uses the SAME square crop as the main photo, so the text lands exactly where it does there. */}
            <div
              className={cn("relative", showEngravingZoomed ? "aspect-square w-full max-w-[min(90vh,64rem)]" : "h-full max-h-[90vh] w-full max-w-5xl")}
              style={showEngravingZoomed ? { containerType: "inline-size" } : undefined}
            >
              <Image src={active.url} alt={active.alt_text ?? productName} fill sizes="100vw" className={showEngravingZoomed ? "object-cover" : "object-contain"} />
              {showEngravingZoomed && engraving && preview ? <EngravingOverlay config={engraving} text={preview.text} placeholder /> : null}
            </div>
            <Dialog.Close aria-label="Close zoom" className="absolute right-4 top-4 rounded-full bg-brand-surface/95 p-2.5 text-brand-dark shadow-card"><X className="h-5 w-5" /></Dialog.Close>
            {count > 1 ? (
              <>
                <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className={cn(arrow, "left-4")}><ChevronLeft className="h-5 w-5" /></button>
                <button type="button" aria-label="Next photo" onClick={() => go(1)} className={cn(arrow, "right-4")}><ChevronRight className="h-5 w-5" /></button>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
