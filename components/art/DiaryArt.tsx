import { cn } from "@/lib/utils/cn";

/** An open diary with a pen and a sprig — the Personal Gifting Diary, drawn in code (placeholder for the client's photograph). */
export function DiaryArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className={cn("h-full w-full", className)} aria-hidden="true" focusable="false">
      <rect width="320" height="200" fill="var(--gp-peach)" />
      <ellipse cx="160" cy="176" rx="130" ry="14" fill="var(--gp-ink)" opacity="0.12" />
      <path d="M40 60l120 14 120-14v104l-120 14-120-14z" fill="var(--gp-surface)" />
      <path d="M160 74v104" stroke="var(--gp-copper)" strokeOpacity="0.5" strokeWidth="2" />
      <path d="M40 60l120 14v104l-120-14z" fill="var(--gp-peach)" opacity="0.5" />
      {[92, 108, 124, 140].map((y, i) => <path key={y} d={`M58 ${y - 10 + i * 0.5}l84 10M178 ${y + 1}l84-10`} stroke="var(--gp-copper-dark)" strokeOpacity="0.32" strokeWidth="2" strokeLinecap="round" />)}
      <path d="M198 96h48v8h-48z" fill="var(--gp-copper)" opacity="0.5" />
      <path d="M254 34l14 8-70 116-10-4z" fill="var(--gp-primary)" />
      <path d="M198 154l-6 12 12-4z" fill="var(--gp-copper)" />
      <path d="M58 44c16-14 40-16 52-8-12 12-36 16-52 8z" fill="var(--gp-primary)" opacity="0.8" />
      <circle cx="80" cy="34" r="6" fill="var(--gp-copper)" /><circle cx="94" cy="30" r="5" fill="var(--gp-peach)" />
    </svg>
  );
}
