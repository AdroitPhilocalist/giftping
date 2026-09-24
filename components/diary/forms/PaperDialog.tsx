"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Robin } from "@/components/art/Robin";
import { HeartDoodle } from "../art/Doodles";
import { Sprig } from "../art/Sprig";
import { caveat } from "../fonts";
import "../diary.css";
import { cn } from "@/lib/utils/cn";

/**
 * A dialog that is a sheet of paper laid on the desk: taped at the top, the robin perched on one corner, a sprig at the bottom. Radix supplies the
 * focus trap, Escape and screen-reader roles. The content is portalled out of the desk, so it carries its own diary variables (`dy-scope`) and font.
 */
export function PaperDialog({ open, onOpenChange, title, subtitle, children, wide = false, aside, tape = "blush", perch = true }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  /** something small tucked at the top right (a polaroid, a calendar) */
  aside?: ReactNode;
  tape?: "blush" | "sage" | "mustard" | "sky";
  perch?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <div className={cn(caveat.variable, "dy-scope")}>
          <Dialog.Overlay className="dy-overlay" />
          <Dialog.Content className={cn("dy-dialog", wide && "dy-dialog--wide")} {...(subtitle ? {} : { "aria-describedby": undefined })}>
            <span className={`dy-tape dy-tape--${tape}`} style={{ top: "-0.75rem", left: "50%", marginLeft: "-3rem", ["--tape-w" as string]: "6rem" }} aria-hidden="true" />
            {perch ? (
              <div className="pointer-events-none absolute -top-[3.1rem] left-5 z-[2] hidden w-[4.6rem] sm:block" aria-hidden="true"><Robin pose="perched" title="" /></div>
            ) : null}
            <div className="dy-dialog-scroll">
              <div className="relative flex items-start justify-between gap-4 px-6 pb-2 pt-7 sm:px-8">
                <div className="min-w-0 pr-8">
                  <Dialog.Title className="dy-hand-b text-[2.15rem] leading-[1]">{title} <HeartDoodle className="text-[0.55em]" /></Dialog.Title>
                  {subtitle ? <Dialog.Description className="dy-sub mt-1">{subtitle}</Dialog.Description> : null}
                </div>
                {aside ? <div className="shrink-0">{aside}</div> : null}
              </div>
              <div className="dy-dialog-body">{children}</div>
              <Sprig variant="wild" className="dy-corner !absolute bottom-1 right-2 hidden h-24 w-12 sm:block" />
            </div>
            <Dialog.Close className="dy-x" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A labelled field on the paper. */
export function PaperField({ label, htmlFor, hint, children, className }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="dy-label">{label}</label>
      {children}
      {hint ? <p className="dy-hint">{hint}</p> : null}
    </div>
  );
}

export function PaperError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="mt-3 rounded-md border border-red-700/30 bg-red-50/70 px-3 py-2 text-sm text-red-800">{message}</p>;
}
