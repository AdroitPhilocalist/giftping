import { Caveat } from "next/font/google";

/**
 * The diary's handwriting. Loaded here (not in the root layout) so only the diary pages pay for it — Next preloads a font
 * for the routes whose layout actually uses it. `--font-caveat` is read by components/diary/diary.css.
 */
export const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});
