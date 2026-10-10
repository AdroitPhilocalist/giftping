import { describe, expect, it } from "vitest";
import { interpretServiceability } from "./shiprocket-serviceability";

describe("interpretServiceability (shapes captured from the real Shiprocket API)", () => {
  it("serviceable route: 5 couriers, cheapest wins Standard, fastest-and-different wins Express", () => {
    const real = {
      data: {
        available_courier_companies: [
          { courier_company_id: 1, courier_name: "A", estimated_delivery_days: "3", etd: "Sep 23, 2026", rate: 60 },
          { courier_company_id: 2, courier_name: "B", estimated_delivery_days: "5", etd: "Sep 25, 2026", rate: 45 },
          { courier_company_id: 3, courier_name: "C", estimated_delivery_days: 4, etd: "Sep 24, 2026", rate: 50 },
        ],
      },
    };
    expect(interpretServiceability(real)).toEqual({
      serviceable: true,
      etdDays: 3,
      courierCount: 3,
      standardEtdDays: 5,
      expressEtdDays: 3,
      expressCourierId: 1,
    });
  });
  it("no Express when the cheapest courier is already the fastest (no real upgrade to sell)", () => {
    const real = {
      data: {
        available_courier_companies: [
          { courier_company_id: 1, courier_name: "A", estimated_delivery_days: "2", rate: 40 },
          { courier_company_id: 2, courier_name: "B", estimated_delivery_days: "5", rate: 60 },
        ],
      },
    };
    const r = interpretServiceability(real);
    expect(r.standardEtdDays).toBe(2);
    expect(r.expressEtdDays).toBeNull();
    expect(r.expressCourierId).toBeNull();
  });
  it("no Express with only one courier available", () => {
    const real = { data: { available_courier_companies: [{ courier_company_id: 1, estimated_delivery_days: "3", rate: 50 }] } };
    const r = interpretServiceability(real);
    expect(r.standardEtdDays).toBe(3);
    expect(r.expressEtdDays).toBeNull();
  });
  it("no rate data anywhere: behaves like the original single-tier result, no Express (nothing to tell 'cheap' from 'fast')", () => {
    const real = {
      data: {
        available_courier_companies: [
          { courier_company_id: 1, estimated_delivery_days: "4" },
          { courier_company_id: 2, estimated_delivery_days: "2" },
        ],
      },
    };
    const r = interpretServiceability(real);
    expect(r.serviceable).toBe(true);
    expect(r.etdDays).toBe(2);
    expect(r.standardEtdDays).toBe(2);
    expect(r.expressEtdDays).toBeNull();
  });
  it("unserviceable route: HTTP 200 with no couriers and a message", () => {
    expect(interpretServiceability({ status: 404, message: "No courier service available between 560001 and 999999", data: {} })).toEqual({
      serviceable: false,
      etdDays: null,
      courierCount: 0,
      standardEtdDays: null,
      expressEtdDays: null,
      expressCourierId: null,
    });
    expect(interpretServiceability({ data: { available_courier_companies: [] } }).serviceable).toBe(false);
  });
  it("is defensive about junk", () => {
    for (const j of [null, undefined, "x", {}, { data: null }]) expect(interpretServiceability(j).serviceable).toBe(false);
    expect(interpretServiceability({ data: { available_courier_companies: [{ estimated_delivery_days: "n/a" }] } })).toEqual({
      serviceable: true,
      etdDays: null,
      courierCount: 1,
      standardEtdDays: null,
      expressEtdDays: null,
      expressCourierId: null,
    });
  });
});
