import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiaryModeProvider } from "@/components/diary/DiaryMode";
import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { PersonSpread } from "@/components/diary/person/PersonSpread";
import { PreviewBanner } from "@/components/diary/preview/PreviewBanner";
import { createClient } from "@/lib/db/server";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { buildPreviewData, buildPreviewPerson, previewCandidatePool } from "@/lib/diary/preview-data";
import { getActiveTheme } from "@/lib/theme/active";

export const metadata: Metadata = {
  title: "A sample person — GiftPing Diary",
  description: "See how one person's page works in GiftPing's personal gifting diary: dates, gift ideas, plans and notes. Sign in to keep your own.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function PreviewPersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ event?: string }> }) {
  const [{ id }, { event }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [livePool, theme] = await Promise.all([loadCandidatePool(supabase), getActiveTheme()]);
  const data = buildPreviewData(livePool.candidates.length > 0 ? livePool : previewCandidatePool());
  const person = buildPreviewPerson(data, id, event);
  if (!person) notFound();

  return (
    <>
      <PreviewBanner />
      <DiaryModeProvider preview>
        <DiaryDesk>
          <PersonSpread
            contact={person.contact}
            photoUrl={null}
            events={person.events}
            moments={person.moments}
            timeline={person.timeline}
            plan={person.plan}
            ideas={person.ideas}
            ideasWho={person.ideasWho}
            pick={person.pick}
            defaultEventType={person.defaultEventType}
            giftsHref={person.giftsHref}
            themeId={theme.id}
          />
        </DiaryDesk>
      </DiaryModeProvider>
    </>
  );
}
