import { Fragment } from "react";
import type { LegalBody } from "./types";

/** Renders the body of one policy clause: paragraphs, bullet lists, and the occasional node that needs a link inside it. */
export function LegalBodyView({ body }: { body: LegalBody[] }) {
  return (
    <>
      {body.map((b, k) =>
        typeof b === "string" ? (
          <p key={k}>{b}</p>
        ) : "node" in b ? (
          <Fragment key={k}>{b.node}</Fragment>
        ) : (
          <ul key={k} className="list-disc space-y-1.5 pl-5 marker:text-brand-secondary">
            {b.list.map((li) => <li key={li}>{li}</li>)}
          </ul>
        ),
      )}
    </>
  );
}
