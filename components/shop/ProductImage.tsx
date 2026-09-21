import Image from "next/image";
import { GiftBoxArt, type BoxTone } from "@/components/art/GiftBoxArt";
import { cn } from "@/lib/utils/cn";

const TONES: BoxTone[] = ["green", "copper", "peach", "ivory"];

export function ProductImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div
        className={cn("flex items-center justify-center bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent", className)}
      >
        <GiftBoxArt tone={TONES[alt.length % TONES.length]} className="w-[42%] opacity-90" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(min-width: 1024px) 25vw, 50vw"}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
