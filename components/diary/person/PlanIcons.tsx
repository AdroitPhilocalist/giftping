import type { PlanStatus } from "@/lib/diary/plans";

/** The five little pictures of the gift plan: a bulb, a tag, a parcel, a wrapped gift, a heart. Coloured from the diary variables. */
export function PlanIcon({ step, className }: { step: PlanStatus; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      {step === "idea" ? (
        <>
          <path d="M24 6c-7.5 0-13 5.2-13 12 0 4.4 2.4 7.4 5 10 1.4 1.4 2 2.7 2 4.5V34h12v-1.5c0-1.8.6-3.1 2-4.5 2.6-2.6 5-5.6 5-10 0-6.8-5.5-12-13-12z" fill="var(--dy-mustard)" />
          <path d="M17 12c2-2 5-3 8-2.6" fill="none" stroke="var(--dy-petal)" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
          <rect x="17" y="36" width="14" height="3.6" rx="1.8" fill="var(--dy-brass)" /><rect x="19" y="40.4" width="10" height="3.2" rx="1.6" fill="var(--dy-foil-lo)" />
          <path d="M24 0v3M6 8l2 2M42 8l-2 2M2 20h3M43 20h3" stroke="var(--dy-gold)" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : null}
      {step === "chosen" ? (
        <>
          <path d="M10 22l14-14 16 3 3 16-14 14z" fill="var(--gp-primary)" transform="rotate(10 24 24)" />
          <circle cx="32" cy="16" r="2.6" fill="var(--dy-petal)" />
          <path d="M27 27c-2.5-2.2-4.2-3.6-3-5.4 1.1-1.6 3-1 3.4.5.6-1.6 2.6-2.2 3.6-.7 1.3 1.9-.5 3.2-4 5.6z" fill="var(--gp-copper)" transform="translate(-3 4)" />
          <path d="M10 10c5-3 9 0 12 3" fill="none" stroke="var(--dy-foil-lo)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      {step === "ordered" ? (
        <>
          <path d="M6 16l18-8 18 8v20l-18 8-18-8z" fill="var(--dy-apricot)" />
          <path d="M6 16l18 8 18-8" fill="none" stroke="var(--dy-brass)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M24 24v20" stroke="var(--dy-brass)" strokeWidth="2" />
          <path d="M15 12l18 8" stroke="var(--dy-brass)" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
          <rect x="29" y="28" width="9" height="6" rx="1" fill="var(--dy-petal)" transform="rotate(-8 33 31)" />
        </>
      ) : null}
      {step === "wrapped" ? (
        <>
          <rect x="7" y="20" width="34" height="22" rx="2.5" fill="var(--gp-primary)" />
          <rect x="5" y="15" width="38" height="8" rx="2.5" fill="var(--gp-primary)" />
          <rect x="5" y="15" width="38" height="3" rx="1.5" fill="var(--dy-petal)" opacity="0.18" />
          <rect x="21" y="15" width="6" height="27" fill="var(--dy-ribbon)" />
          <path d="M24 15c-8-1-13-6-9-10 4-3 8 4 9 10zM24 15c8-1 13-6 9-10-4-3-8 4-9 10z" fill="var(--dy-ribbon)" />
          <circle cx="24" cy="15" r="2.6" fill="var(--dy-ribbon-hi)" />
        </>
      ) : null}
      {step === "given" ? (
        <>
          <path d="M24 42C8 30 5 19 11 12c5-5 11-2 13 3 2-5 8-8 13-3 6 7 3 18-13 30z" fill="var(--dy-heart)" />
          <ellipse cx="14" cy="17" rx="3.6" ry="2.2" transform="rotate(-36 14 17)" fill="var(--dy-petal)" opacity="0.7" />
          <path d="M40 6l1 2.6 2.6 1-2.6 1L40 13.2 39 10.6 36.4 9.6 39 8.6z" fill="var(--dy-gold)" />
        </>
      ) : null}
    </svg>
  );
}
