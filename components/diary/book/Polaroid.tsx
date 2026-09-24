import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { initialOf, monogramTone } from "@/lib/diary/present";
import { cn } from "@/lib/utils/cn";

/** A person without a photo: a soft tinted card with their initial — same shape as a photograph, so shelves stay even. */
export function Monogram({ name, size }: { name: string; size?: string }) {
  return (
    <span className={`dy-monogram dy-monogram--${monogramTone(name)}`} style={size ? ({ "--mono-size": size } as CSSProperties) : undefined} aria-hidden="true">
      <span>{initialOf(name)}</span>
    </span>
  );
}

export interface PolaroidProps {
  /** Shown under the picture, in handwriting. */
  caption?: ReactNode;
  /** A photo (signed URL from the private bucket) or nothing — then the person's initial is drawn. */
  photoUrl?: string | null;
  /** Used for the initial, the tint and the image's alt text. */
  name?: string;
  href?: string;
  tilt?: number;
  tape?: "blush" | "sage" | "mustard" | "sky" | "apricot" | "none";
  /** A different picture (a product, a place) instead of a person. */
  media?: ReactNode;
  ratio?: string;
  className?: string;
  children?: ReactNode;
  ariaLabel?: string;
}

/** A photograph with a white border and a strip of tape. A link when it has an href (lifts and straightens on hover). */
export function Polaroid({ caption, photoUrl, name = "", href, tilt = 0, tape = "blush", media, ratio, className, children, ariaLabel }: PolaroidProps) {
  const style = { "--tilt": `${tilt}deg`, ...(ratio ? { "--photo-ratio": ratio } : null) } as CSSProperties;
  /* eslint-disable-next-line @next/next/no-img-element -- a private, short-lived signed URL: the image optimiser must not cache it */
  const photo = photoUrl ? <img src={photoUrl} alt={name ? `Photo of ${name}` : ""} loading="lazy" decoding="async" /> : null;
  const body = (
    <>
      {tape !== "none" ? <span className={`dy-tape dy-tape--${tape}`} style={{ top: "-0.7rem", left: "50%", marginLeft: "-2.4rem", "--tape-rot": `${tilt > 0 ? -5 : 4}deg` } as CSSProperties} aria-hidden="true" /> : null}
      <span className="dy-polaroid-photo block">
        {media ?? photo ?? <Monogram name={name || "?"} />}
      </span>
      {caption ? <span className="dy-polaroid-cap block">{caption}</span> : null}
      {children}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cn("dy-polaroid", className)} style={style} aria-label={ariaLabel}>
        {body}
      </Link>
    );
  }
  return (
    <figure className={cn("dy-polaroid", className)} style={style} aria-label={ariaLabel}>
      {body}
    </figure>
  );
}
