"use client";

import { useState } from "react";
import Image from "next/image";
import { Gift, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface GalleryImage {
  url: string;
  alt_text: string | null;
}

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-brand-accent to-brand-secondary/20">
        <Gift className="h-1/4 w-1/4 text-brand-secondary-dark/50" strokeWidth={1.25} />
      </div>
    );
  }

  const active = images[activeIndex];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-accent/30">
        <Image
          src={active.url}
          alt={active.alt_text ?? productName}
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="object-cover"
          priority
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => setActiveIndex((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-surface/90 text-brand-dark shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setActiveIndex((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-surface/90 text-brand-dark shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={image.url + index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2",
                index === activeIndex ? "border-brand-secondary" : "border-transparent",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
