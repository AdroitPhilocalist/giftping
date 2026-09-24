import Image from "next/image";
import { siteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";
import "../diary-tokens.css";

/**
 * One small illustration per kind of occasion — the diary's stickers. The client's watercolour art wins when it has been delivered
 * (`sticker-<type>` in lib/content/imagery.ts); until then a code-drawn version fills in, coloured from the diary variables so
 * it follows a festival theme and needs no download.
 */
export type OccasionType = "birthday" | "anniversary" | "wedding" | "housewarming" | "graduation" | "festival" | "thank-you" | "other";

const KNOWN: OccasionType[] = ["birthday", "anniversary", "wedding", "housewarming", "graduation", "festival", "thank-you", "other"];
export const asOccasionType = (value: string | null | undefined): OccasionType => (KNOWN.includes(value as OccasionType) ? (value as OccasionType) : "other");

function Drawing({ type }: { type: OccasionType }) {
  switch (type) {
    case "birthday":
      return (
        <>
          <ellipse cx="32" cy="55" rx="27" ry="5.5" fill="var(--dy-paper-edge)" opacity="0.7" />
          <rect x="9" y="35" width="46" height="18" rx="4.5" fill="var(--dy-rose)" />
          <rect x="15" y="22" width="34" height="15" rx="4.5" fill="var(--dy-blush)" />
          <path d="M9 39q5.5 8 11.5 0t11.5 0 11.5 0 11.5 0v-6H9z" fill="var(--dy-petal)" />
          <path d="M15 26q4.3 6.5 8.5 0t8.5 0 8.5 0 8.5 0v-4.5H15z" fill="var(--dy-petal)" />
          <circle cx="18" cy="46" r="1.5" fill="var(--dy-mustard)" /><circle cx="30" cy="48" r="1.5" fill="var(--dy-petal)" /><circle cx="42" cy="46.5" r="1.5" fill="var(--dy-mustard)" /><circle cx="50" cy="48" r="1.4" fill="var(--dy-petal)" />
          <rect x="21" y="12" width="3.6" height="11" rx="1.2" fill="var(--dy-rose)" /><rect x="30.2" y="10" width="3.6" height="13" rx="1.2" fill="var(--dy-sky)" /><rect x="39.4" y="12" width="3.6" height="11" rx="1.2" fill="var(--dy-mustard)" />
          <path d="M22.8 3.5c2.4 2.6 2.6 5.2 0 6.4-2.6-1.2-2.4-3.8 0-6.4z" fill="var(--dy-flame)" /><path d="M32 1.5c2.4 2.6 2.6 5.2 0 6.4-2.6-1.2-2.4-3.8 0-6.4z" fill="var(--dy-flame)" /><path d="M41.2 3.5c2.4 2.6 2.6 5.2 0 6.4-2.6-1.2-2.4-3.8 0-6.4z" fill="var(--dy-flame)" />
        </>
      );
    case "anniversary":
      return (
        <>
          <path d="M32 56C9 40 5 22 16 13c8-6 15-1 16 6 1-7 8-12 16-6 11 9 7 27-16 43z" fill="var(--dy-heart)" />
          <path d="M32 56C9 40 5 22 16 13c8-6 15-1 16 6 0 14 0 24 0 37z" fill="var(--dy-rose)" opacity="0.5" />
          <ellipse cx="19" cy="21" rx="4.5" ry="2.8" transform="rotate(-38 19 21)" fill="var(--dy-petal)" opacity="0.75" />
          <path d="M52 8l1.4 3.4 3.4 1.4-3.4 1.4L52 17.6l-1.4-3.4-3.4-1.4 3.4-1.4z" fill="var(--dy-gold)" />
        </>
      );
    case "wedding":
      return (
        <>
          <circle cx="24" cy="38" r="15" fill="none" stroke="var(--dy-gold)" strokeWidth="5.5" />
          <circle cx="40" cy="38" r="15" fill="none" stroke="var(--dy-brass)" strokeWidth="5.5" />
          <path d="M24 23a15 15 0 0 1 9 3" fill="none" stroke="var(--dy-petal)" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          <path d="M32 6l7 7-7 9-7-9z" fill="var(--dy-sky)" /><path d="M32 6l7 7h-14z" fill="var(--dy-petal)" opacity="0.7" />
        </>
      );
    case "housewarming":
      return (
        <>
          <rect x="13" y="28" width="38" height="26" rx="2" fill="var(--dy-petal)" stroke="var(--dy-paper-edge)" strokeWidth="1" />
          <path d="M6 31L32 9l26 22z" fill="var(--gp-copper)" />
          <path d="M6 31L32 9l4 3.5L14 31z" fill="var(--dy-petal)" opacity="0.22" />
          <rect x="43" y="10" width="5.5" height="11" fill="var(--dy-leaf-lo)" />
          <rect x="26.5" y="38" width="11" height="16" rx="5.5" fill="var(--dy-leaf-lo)" /><circle cx="35" cy="47" r="1" fill="var(--dy-gold)" />
          <rect x="16.5" y="35" width="7" height="7" rx="1" fill="var(--dy-sky)" /><rect x="40.5" y="35" width="7" height="7" rx="1" fill="var(--dy-sky)" />
          <path d="M47 50q3-5 6 0-3 4-6 0z" fill="var(--dy-rose)" /><path d="M11 50q3-5 6 0-3 4-6 0z" fill="var(--dy-mustard)" />
        </>
      );
    case "graduation":
      return (
        <>
          <path d="M18 30v11c0 4 6.5 8 14 8s14-4 14-8V30z" fill="var(--gp-primary)" />
          <path d="M32 12L59 25 32 38 5 25z" fill="var(--gp-primary)" />
          <path d="M32 12L59 25 32 38 5 25z" fill="var(--dy-petal)" opacity="0.14" />
          <path d="M32 12L59 25 32 25z" fill="var(--dy-petal)" opacity="0.16" />
          <path d="M55 26v15" stroke="var(--dy-gold)" strokeWidth="2.2" strokeLinecap="round" /><circle cx="55" cy="44" r="2.8" fill="var(--dy-gold)" /><path d="M53 44l-1.5 8M57 44l1.5 8" stroke="var(--dy-gold)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="32" cy="25" r="2.4" fill="var(--dy-gold)" />
        </>
      );
    case "festival":
      return (
        <>
          <path d="M6 36h52c0 12-11.5 20-26 20S6 48 6 36z" fill="var(--dy-brass)" />
          <path d="M6 36h52c-1 3-2 5-4 7-6-3-12-4-22-4S12 40 8 43c-1.2-2-2-4-2-7z" fill="var(--dy-gold)" opacity="0.7" />
          <ellipse cx="32" cy="36" rx="26" ry="4" fill="var(--dy-leaf-lo)" opacity="0.4" />
          <path d="M32 6c7 9 9 15 0 24-9-9-7-15 0-24z" fill="var(--dy-flame)" /><path d="M32 15c3.4 4.4 4 8 0 11.6-4-3.6-3.4-7.2 0-11.6z" fill="var(--dy-mustard)" />
          <circle cx="10" cy="56" r="4" fill="var(--dy-flame)" opacity="0.9" /><circle cx="54" cy="56" r="4" fill="var(--dy-mustard)" opacity="0.9" />
        </>
      );
    case "thank-you":
      return (
        <>
          <path d="M32 58C28 46 24 36 20 26M32 58c1-12 6-24 12-34M32 58c0-10 0-22-1-34" fill="none" stroke="var(--dy-leaf-lo)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M28 46c-7-1-12 2-14 7 7 2 12 0 14-7zM35 44c7-1 12 2 14 7-7 2-12 0-14-7z" fill="var(--dy-leaf)" />
          {[{ x: 19, y: 22, c: "var(--dy-rose)" }, { x: 44, y: 21, c: "var(--dy-apricot)" }, { x: 31, y: 17, c: "var(--dy-blush)" }].map((f) => (
            <g key={f.x} transform={`translate(${f.x} ${f.y})`}>
              {Array.from({ length: 5 }, (_, i) => <circle key={i} cy={-6} r={5} transform={`rotate(${i * 72})`} fill={f.c} />)}
              <circle r={3} fill="var(--dy-gold)" />
            </g>
          ))}
          <path d="M25 50l7 3 7-3-3 8-4-3-4 3z" fill="var(--gp-copper)" />
        </>
      );
    default:
      return (
        <>
          <rect x="9" y="27" width="46" height="27" rx="3" fill="var(--dy-blush)" />
          <rect x="6" y="20" width="52" height="10" rx="3" fill="var(--dy-rose)" />
          <rect x="28.5" y="20" width="7" height="34" fill="var(--dy-mustard)" />
          <path d="M32 20c-9-1-14-6-11-10 4-3 10 3 11 10zM32 20c9-1 14-6 11-10-4-3-10 3-11 10z" fill="var(--dy-gold)" />
          <path d="M9 30h46" stroke="var(--dy-petal)" strokeWidth="1" opacity="0.5" />
        </>
      );
  }
}

export function OccasionSticker({ type, className, themeId }: { type: string | null | undefined; className?: string; themeId?: string }) {
  const kind = asOccasionType(type);
  const art = siteImage(`sticker-${kind}`, themeId);
  if (art) return <Image src={art.src} alt="" width={art.width} height={art.height} sizes="96px" className={cn("h-auto object-contain", className)} />;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={cn("overflow-visible", className)}>
      <Drawing type={kind} />
    </svg>
  );
}
