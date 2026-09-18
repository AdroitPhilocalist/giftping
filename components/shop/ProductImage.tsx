import Image from "next/image";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-accent to-brand-secondary/20",
          className,
        )}
      >
        <Gift className="h-1/4 w-1/4 text-brand-secondary-dark/50" strokeWidth={1.25} />
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
