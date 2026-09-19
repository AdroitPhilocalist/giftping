import { describe, expect, it } from "vitest";
import { mapShiprocketStatus, normaliseRawStatus } from "./shiprocket-status";

describe("mapShiprocketStatus", () => {
  it("maps the core lifecycle", () => {
    expect(mapShiprocketStatus("PICKUP SCHEDULED")).toBe("confirmed");
    expect(mapShiprocketStatus("AWB ASSIGNED")).toBe("confirmed");
    expect(mapShiprocketStatus("PICKED UP")).toBe("picked_up");
    expect(mapShiprocketStatus("IN TRANSIT")).toBe("in_transit");
    expect(mapShiprocketStatus("REACHED AT DESTINATION HUB")).toBe("in_transit");
    expect(mapShiprocketStatus("OUT FOR DELIVERY")).toBe("out_for_delivery");
    expect(mapShiprocketStatus("DELIVERED")).toBe("delivered");
  });
  it("is tolerant of case, underscores and spacing", () => {
    expect(mapShiprocketStatus("out_for_delivery")).toBe("out_for_delivery");
    expect(mapShiprocketStatus("  Picked   Up ")).toBe("picked_up");
    expect(normaliseRawStatus("in-transit")).toBe("IN TRANSIT");
  });
  it("treats every RTO status as returning, and cancelled spellings alike", () => {
    for (const s of ["RTO INITIATED", "RTO IN TRANSIT", "RTO DELIVERED", "RTO OFD"]) expect(mapShiprocketStatus(s)).toBe("rto_initiated");
    expect(mapShiprocketStatus("CANCELED")).toBe("cancelled");
    expect(mapShiprocketStatus("CANCELLED")).toBe("cancelled");
  });
  it("returns null for unknown / exceptional statuses instead of guessing", () => {
    for (const s of ["LOST", "DAMAGED", "PICKUP EXCEPTION", "", undefined, null, 42]) expect(mapShiprocketStatus(s)).toBeNull();
  });
  it("does not confuse DELIVERED with UNDELIVERED", () => {
    expect(mapShiprocketStatus("UNDELIVERED")).toBe("in_transit");
  });
});
