import { DiaryDesk } from "@/components/diary/book/DiaryDesk";
import { RobinTurningPage } from "@/components/diary/EmptyStates";

export default function DiaryLoading() {
  return (
    <DiaryDesk>
      <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
        <RobinTurningPage />
      </div>
    </DiaryDesk>
  );
}
