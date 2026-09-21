"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Robin } from "@/components/art/Robin";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Robin pose="perched" className="w-32" title="The GiftPing robin" />
      <h1 className="mt-4 font-heading text-3xl text-brand-dark">Something went wrong</h1>
      <p className="mt-2 text-sm text-brand-dark/60">
        We couldn&apos;t load this page. If you followed a link here, it may require a different
        account or permissions.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
