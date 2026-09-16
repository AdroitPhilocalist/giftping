# GiftPing

A premium multi-vendor gifting marketplace for the Indian market, built as an immersive virtual mall —
with a signature **Personal Gifting Diary** that reminds customers of loved ones' important dates ahead of
time, so gifting becomes a habit, not an afterthought.

Start here:

- **[`PROGRESS.md`](./PROGRESS.md)** — current build stage, what's done, what's next. Read this first,
  every session.
- **[`CLAUDE.md`](./CLAUDE.md)** — static project reference: design tokens, folder structure, stack
  decisions and why they deviate from the original SRS.
- `GIFTPING_SRS_Development_Bible.docx` / `Feature_Specification_Gifting_Platform.docx` — the original
  client-provided specification documents.
- `ui-references/` — the client-approved visual reference screens.

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in credentials as each build stage requires them (see the
"needed at" comment on each group in that file, and the Credentials Status table in `PROGRESS.md`).

Open [http://localhost:3000](http://localhost:3000). The `/kitchen-sink` route exercises every base UI
component in `components/ui/`.
