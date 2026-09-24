import type { ReactNode } from "react";

// The diary's own look (paper, desk, handwriting) is applied by <DiaryDesk> on each page, which brings its own font and stylesheet with it —
// this layout exists so the whole /diary section shares one place for anything that must wrap every diary screen.
export default function DiaryLayout({ children }: { children: ReactNode }) {
  return children;
}
