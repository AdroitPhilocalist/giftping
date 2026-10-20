"use client";

import type { ComponentProps } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

/**
 * "Print this copy" — a legal page is a document, and people keep copies of documents. Uses the browser's own print dialog, so
 * there is no server round trip and nothing to download. Hidden in print output itself (see .deed-noprint in legal.css).
 */
export function PrintButton({ size = "md", label = "Print this copy", className }: {
  size?: ComponentProps<typeof Button>["size"];
  label?: string;
  className?: string;
}) {
  return (
    <Button type="button" variant="secondary" size={size} onClick={() => window.print()} className={cn("deed-noprint", className)}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
