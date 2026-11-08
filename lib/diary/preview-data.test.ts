import { describe, expect, it } from "vitest";
import { buildPreviewData, buildPreviewPerson, previewCandidatePool } from "./preview-data";

const TODAY = "2026-11-07";

describe("guest diary preview", () => {
  it("builds a full sample book without touching real rows", () => {
    const data = buildPreviewData(previewCandidatePool(), TODAY);
    expect(data.rows.contacts).toHaveLength(5);
    expect(data.rows.events.length).toBeGreaterThanOrEqual(6);
    expect(data.rows.gifts.length).toBeGreaterThanOrEqual(6);
    expect(data.home.people).toHaveLength(5);
    expect(data.home.moments.length).toBeGreaterThanOrEqual(6);
    expect(data.home.ideaSets).toHaveLength(2);
    expect(data.people.size).toBe(5);
    expect(data.rows.contacts.every((c) => c.id.startsWith("preview-"))).toBe(true);
    expect(data.rows.gifts.every((g) => g.id.startsWith("preview-"))).toBe(true);
  });

  it("keeps the sample dates relative to today", () => {
    const data = buildPreviewData(previewCandidatePool(), TODAY);
    const mom = data.people.get("preview-mom")!;
    expect(mom.plan?.daysAway).toBe(9);
    expect(mom.plan?.occasionDate).toBe("2026-11-16");
    expect(mom.plan?.plan?.status).toBe("chosen");
    expect(mom.ideas.length).toBeGreaterThan(0);

    const meera = data.people.get("preview-meera")!;
    expect(meera.plan?.daysAway).toBe(14);
    expect(meera.plan?.plan?.status).toBe("idea");
  });

  it("can open a specific sample date, like the real person page", () => {
    const data = buildPreviewData(previewCandidatePool(), TODAY);
    const momAnniversary = buildPreviewPerson(data, "preview-mom", "preview-e2");
    expect(momAnniversary?.plan?.daysAway).toBe(18);
    expect(momAnniversary?.plan?.heading).toContain("anniversary");
    expect(buildPreviewPerson(data, "preview-missing")).toBeNull();
  });

  it("works when the live catalogue is empty", () => {
    const data = buildPreviewData({ candidates: [], byId: new Map() }, TODAY);
    expect(data.pool.candidates.length).toBeGreaterThan(0);
    expect(data.home.ideaSets).toHaveLength(2);
  });
});
