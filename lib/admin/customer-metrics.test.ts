import { describe, expect, it } from "vitest";
import { summariseCustomers } from "./customer-metrics";

const range = { days: 7, today: "2026-10-02" };
// 12:00 IST on the given day — safely inside that IST calendar day regardless of UTC offset
const at = (day: string) => `${day}T12:00:00+05:30`;

describe("summariseCustomers", () => {
  it("returns zeros, not NaN, with no data", () => {
    const m = summariseCustomers([], [], range);
    expect(m).toMatchObject({ totalCustomers: 0, newCustomers: 0, buyers: 0, repeatBuyers: 0, repeatRate: 0, ordersPerBuyer: 0, returningShare: 0 });
    expect(m.dailySignups).toHaveLength(7);
    expect(m.dailySignups.every((d) => d.count === 0)).toBe(true);
  });

  it("counts sign-ups per IST day inside the window only", () => {
    const m = summariseCustomers(
      [
        { id: "a", created_at: at("2026-10-02") },
        { id: "b", created_at: at("2026-10-02") },
        { id: "c", created_at: at("2026-09-28") },
        { id: "old", created_at: at("2026-09-01") }, // before the window
      ],
      [],
      range,
    );
    expect(m.totalCustomers).toBe(4);
    expect(m.newCustomers).toBe(3);
    expect(m.dailySignups.find((d) => d.date === "2026-10-02")?.count).toBe(2);
    expect(m.dailySignups.find((d) => d.date === "2026-09-28")?.count).toBe(1);
    expect(m.dailySignups[0].date).toBe("2026-09-26");
  });

  it("buckets a late-evening UTC sign-up into the next IST day", () => {
    // 20:00 UTC on 1 Oct is 01:30 IST on 2 Oct
    const m = summariseCustomers([{ id: "a", created_at: "2026-10-01T20:00:00Z" }], [], range);
    expect(m.dailySignups.find((d) => d.date === "2026-10-02")?.count).toBe(1);
  });

  it("works out buyers, repeat buyers and rates over all history", () => {
    const m = summariseCustomers(
      [],
      [
        { customer_id: "x", placed_at: at("2026-01-05") },
        { customer_id: "x", placed_at: at("2026-10-01") },
        { customer_id: "y", placed_at: at("2026-10-01") },
        { customer_id: "z", placed_at: at("2026-02-01") },
      ],
      range,
    );
    expect(m.buyers).toBe(3);
    expect(m.repeatBuyers).toBe(1);
    expect(m.repeatRate).toBe(0.33);
    expect(m.ordersPerBuyer).toBe(1.33);
  });

  it("flags an in-window order as returning only if the customer bought earlier (even before the window), regardless of input order", () => {
    const m = summariseCustomers(
      [],
      [
        { customer_id: "x", placed_at: at("2026-10-01") }, // listed first but chronologically second
        { customer_id: "x", placed_at: at("2026-01-05") }, // before the window → not counted in the window at all
        { customer_id: "y", placed_at: at("2026-09-30") }, // first-ever order
        { customer_id: "y", placed_at: at("2026-10-02") }, // returning, in window
      ],
      range,
    );
    expect(m.periodOrders).toBe(3);
    expect(m.returningOrders).toBe(2);
    expect(m.returningShare).toBe(0.67);
  });

  it("counts new sign-ups who have already bought", () => {
    const m = summariseCustomers(
      [
        { id: "a", created_at: at("2026-10-01") },
        { id: "b", created_at: at("2026-10-01") },
        { id: "old", created_at: at("2026-01-01") },
      ],
      [
        { customer_id: "a", placed_at: at("2026-10-02") },
        { customer_id: "old", placed_at: at("2026-10-02") },
      ],
      range,
    );
    expect(m.newCustomers).toBe(2);
    expect(m.newCustomersWhoBought).toBe(1);
  });

  it("adds customers that weren't loaded to the headline total", () => {
    expect(summariseCustomers([{ id: "a", created_at: at("2026-10-02") }], [], range, 40).totalCustomers).toBe(41);
  });
});
