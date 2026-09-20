import Link from "next/link";
import { Bird } from "lucide-react";

/** The dark strip above the header: the robin, one line (a theme can change it), and quick help links. */
export function AnnouncementBar({ message }: { message: string }) {
  return (
    <div className="bg-brand-primary text-brand-on-primary">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs sm:justify-between sm:px-6 lg:px-8">
        <span className="hidden w-48 sm:block" aria-hidden="true" />
        <p className="flex items-center gap-2 text-center">
          <Bird className="h-3.5 w-3.5 shrink-0 text-brand-secondary" aria-hidden="true" />
          <span>{message}</span>
        </p>
        <nav aria-label="Help" className="hidden w-48 items-center justify-end gap-2 whitespace-nowrap text-brand-on-primary/80 sm:flex">
          <Link href="/account" className="hover:text-brand-on-primary">Track Order</Link>
          <span aria-hidden="true" className="opacity-40">|</span>
          <Link href="/contact" className="hover:text-brand-on-primary">Help &amp; Support</Link>
        </nav>
      </div>
    </div>
  );
}
