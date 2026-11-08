import type { Metadata } from "next";
import { DiaryModeProvider } from "@/components/diary/DiaryMode";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { DiaryBook } from "@/components/diary/flip/DiaryBook";
import { buildHomeSpreads } from "@/components/diary/pages/buildSpreads";
import { PreviewBanner } from "@/components/diary/preview/PreviewBanner";
import { createClient } from "@/lib/db/server";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { buildPreviewData, previewCandidatePool } from "@/lib/diary/preview-data";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata: Metadata = {
  title: "My Gifting Diary — a sample — GiftPing",
  description: "Look around a sample of GiftPing's personal gifting diary — people, dates, gift ideas and reminders. Sign in to save your own.",
  // The sample is a useful door into the product, but it should never be indexed as if it were a
  // customer's diary. The real /diary is protected and never reachable by a crawler anyway.
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function DiaryPreviewPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const supabase = await createClient();
  const [livePool, theme] = await Promise.all([loadCandidatePool(supabase), getActiveTheme()]);
  // A cold local database can return no products; the preview still needs a catalogue to draw.
  const data = buildPreviewData(livePool.candidates.length > 0 ? livePool : previewCandidatePool());

  return (
    <>
      <PreviewBanner />
      <DiaryModeProvider preview>
        <DiaryDesk className="xl:pb-4 xl:pt-3">
          <DiaryBook spreads={buildHomeSpreads("Priya", data.home, theme.id, { preview: true })} initialId={p} />
        </DiaryDesk>
      </DiaryModeProvider>
    </>
  );
}
