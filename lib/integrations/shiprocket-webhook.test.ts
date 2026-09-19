import { describe, expect, it } from "vitest";
import { parseCourierTimestamp, parseTrackingPayload } from "./shiprocket-webhook";

describe("parseCourierTimestamp", () => {
  it("treats zoneless courier timestamps as IST", () => {
    expect(parseCourierTimestamp("2026-09-20 10:11:12")).toBe("2026-09-20T10:11:12+05:30");
    expect(parseCourierTimestamp("2026-09-20T10:11")).toBe("2026-09-20T10:11:00+05:30");
  });
  it("keeps timestamps that already carry a zone", () => {
    expect(parseCourierTimestamp("2026-09-20T10:11:12Z")).toBe("2026-09-20T10:11:12.000Z");
  });
  it("rejects junk", () => {
    for (const v of ["", "not a date", null, undefined, 5]) expect(parseCourierTimestamp(v)).toBeNull();
  });
});

describe("parseTrackingPayload", () => {
  const payload = {
    awb: "AWB123",
    current_status: "IN TRANSIT",
    current_timestamp: "2026-09-21 09:00:00",
    etd: "2026-09-24 18:00:00",
    scans: [
      { date: "2026-09-20 10:00:00", activity: "Picked up", location: "Kochi", "sr-status-label": "PICKED UP" },
      { date: "2026-09-21 09:00:00", activity: "Shipment in transit", location: "Bengaluru Hub", "sr-status-label": "IN TRANSIT" },
    ],
  };
  it("extracts awb, mapped status, etd and a deduplicable event list", () => {
    const p = parseTrackingPayload(payload)!;
    expect(p.awb).toBe("AWB123");
    expect(p.status).toBe("in_transit");
    expect(p.etd).toBe("2026-09-24");
    expect(p.events.map((e) => e.raw_status)).toEqual(["PICKED UP", "IN TRANSIT", "IN TRANSIT"]);
    expect(p.events[0].occurred_at).toBe("2026-09-20T10:00:00+05:30");
    expect(p.dedupeKey).toBe("AWB123|IN TRANSIT|2026-09-21T09:00:00+05:30");
  });
  it("returns null for payloads with no AWB (e.g. Shiprocket's test ping)", () => {
    expect(parseTrackingPayload({})).toBeNull();
    expect(parseTrackingPayload(null)).toBeNull();
    expect(parseTrackingPayload("x")).toBeNull();
  });
  it("tolerates missing/odd scans and unknown statuses", () => {
    const p = parseTrackingPayload({ awb: "A", current_status: "LOST", scans: [null, 3, { date: "bad" }] })!;
    expect(p.status).toBeNull();
    expect(p.events).toHaveLength(0);
  });
  it("caps absurdly large scan arrays", () => {
    const scans = Array.from({ length: 1000 }, (_, i) => ({ date: `2026-09-20 10:${String(i % 60).padStart(2, "0")}:00`, "sr-status-label": `S${i}` }));
    expect(parseTrackingPayload({ awb: "A", current_status: "IN TRANSIT", scans })!.events.length).toBeLessThanOrEqual(201);
  });
});
