import Image from "next/image";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

/** Sign-in / sign-up frame. With the client's welcome picture (auth-welcome) it becomes a two-panel doorway on wide screens; without it, the plain centred form. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const art = siteImage("auth-welcome", (await getActiveTheme()).id);
  if (!art) {
    return <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">{children}</div>;
  }
  return (
    <div className="mx-auto grid min-h-[75vh] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-stretch">
      <div className="relative hidden overflow-hidden rounded-card shadow-lift lg:block" aria-hidden="true">
        {/* the whole panel is `hidden lg:block`, so this never actually renders below 1024px — sizes' first branch (50vw) is the real one;
            the fallback is deliberately near-zero so Next's `priority` preload doesn't fetch a full-width picture nobody on a phone will see. */}
        <Image src={art.src} alt="" fill priority sizes="(min-width: 1024px) 50vw, 10px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/85 via-brand-primary-dark/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-white/80">Welcome to GiftPing</p> {/* theme-safe: text on a photo scrim */}
          <p className="mt-3 font-heading text-4xl leading-tight text-white">Every gift tells a story.</p> {/* theme-safe: text on a photo scrim */}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6">{children}</div>
    </div>
  );
}
