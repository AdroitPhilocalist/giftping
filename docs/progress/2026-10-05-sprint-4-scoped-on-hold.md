# 5 Oct 2026 — Sprint 4 ("Cinematic") scoped, then put on hold for real artwork

Asked to "go ahead with Sprint 4." Before writing any code, checked what was actually blocking it (flagged back in the ideas doc): B2/B5 need layered atrium art that doesn't exist (only the flat `hero-atrium.png` does), and B2 also needed a decision on the scroll sequence itself. Rather than guess at either — a wrong guess here means throwing away real build time and possibly commissioning the wrong art — asked three direct questions instead of building.

**Decisions made:**
1. **Wait for real layered art**, not a CSS approximation using the existing flat photo + drawn robin/gift-box elements. (The approximation was offered as the faster option; declined.)
2. **Sequence, if/when built**: an atrium depth-scroll intro — scrolling down drifts into the atrium (far/mid/near layers at different speeds, light warming), confined to one screen-tall intro, then the page releases into the ordinary homepage below. Not a replacement for the homepage.
3. **D1 (3D gift box) dropped from this sprint entirely** — no `.glb` model exists, and a placeholder CSS "box" was declined rather than built as a stand-in.

**What was actually done this session**: nothing in the app. Wrote the art brief that unblocks this — `docs/design/asset-prompts.md`'s new **Batch 5**: three prompts for `atrium-layer-far.png` / `-mid.png` / `-near.png`, each a separate transparent-background illustration confined to its own depth band (far = skylight/architecture, mid = hanging gift boxes/lights, near = platform/shopfront edges), designed to composite together for real parallax — explicitly NOT "crop the existing photo in three," since an image model can't un-flatten a photo into separable depth layers; three independent simpler paintings that stack is the realistic path. Updated `docs/ideas/DELIGHT_AND_FEATURE_IDEAS.md` (B2/B5 marked ⏸ on hold with the confirmed sequence recorded so it isn't lost, D1 marked skipped, Sprint 4 row marked on hold).

**Next:** once Batch 5's three files exist (`ui-references/batch-1/` → `npm run images:sync`), build B2 + B5 against them. Nothing else is blocked on this — unrelated work can continue in the meantime.
