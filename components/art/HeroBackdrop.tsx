import Image from "next/image";
import type { SiteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";

/** Client artwork on the right of a banner, dissolving into the page on its left so the headline stays readable. Hidden on phones, where the text needs the room. */
export function HeroBackdrop({ image, priority = false, className }: { image: SiteImage; priority?: boolean; className?: string }) {
  return (
    <div className={cn("absolute inset-y-0 right-0 hidden w-[62%] [mask-image:linear-gradient(to_right,transparent_0%,black_45%)] md:block", className)} aria-hidden="true">
      <Image src={image.src} alt="" fill priority={priority} sizes="60vw" className="object-cover" />
    </div>
  );
}
