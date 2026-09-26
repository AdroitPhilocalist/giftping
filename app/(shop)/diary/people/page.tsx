import { redirect } from "next/navigation";

// The people now live in the diary book itself (a page of six at a time); this address just opens that page.
export default function DiaryPeoplePage() {
  redirect("/diary?p=people");
}
