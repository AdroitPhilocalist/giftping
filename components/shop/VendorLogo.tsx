import Image from "next/image";
import { Store } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** A boutique's round logo, or the default shop icon until they upload one. `sizeClass` sets both dimensions (e.g. "h-12 w-12"). */
export function VendorLogo({ url, name, sizeClass, iconClass = "h-5 w-5", className }: { url: string | null; name: string; sizeClass: string; iconClass?: string; className?: string }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-accent text-brand-secondary-dark", sizeClass, className)}>
      {url ? <Image src={url} alt={`${name} logo`} fill sizes="96px" className="object-cover" /> : <Store className={iconClass} aria-hidden="true" />}
    </span>
  );
}
