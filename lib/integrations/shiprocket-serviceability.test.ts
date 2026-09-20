import { describe, expect, it } from "vitest";
import { interpretServiceability } from "./shiprocket-serviceability";

describe("interpretServiceability (shapes captured from the real Shiprocket API)", () => {
  it("serviceable route: 5 couriers, cheapest ETA wins, string days are numbers", () => {
    const real = {
      data: {
        available_courier_companies: [
          { courier_company_id: 1, courier_name: "A", estimated_delivery_days: "3", etd: "Sep 23, 2026", rate: 60 },
          { courier_company_id: 2, courier_name: "B", estimated_delivery_days: "5", etd: "Sep 25, 2026", rate: 45 },
          { courier_company_id: 3, courier_name: "C", estimated_delivery_days: 4, etd: "Sep 24, 2026", rate: 50 },
        ],
      },
    };
    expect(interpretServiceability(real)).toEqual({ serviceable: true, etdDays: 3, courierCount: 3 });
  });
  it("unserviceable route: HTTP 200 with no couriers and a message", () => {
    expect(interpretServiceability({ status: 404, message: "No courier service available between 560001 and 999999", data: {} })).toEqual({
      serviceable: false, etdDays: null, courierCount: 0,
    });
    expect(interpretServiceability({ data: { available_courier_companies: [] } }).serviceable).toBe(false);
  });
  it("is defensive about junk", () => {
    for (const j of [null, undefined, "x", {}, { data: null }]) expect(interpretServiceability(j).serviceable).toBe(false);
    expect(interpretServiceability({ data: { available_courier_companies: [{ estimated_delivery_days: "n/a" }] } })).toEqual({ serviceable: true, etdDays: null, courierCount: 1 });
  });
});
