import { describe, expect, it } from "vitest";
import { effectivePlanStatus, findLinkedOrder, isPlacedOrderStatus, nextStatus, planFor, stepIndex, type DiaryPlanRow, type LinkedOrder } from "./plans";

const plan = (over: Partial<DiaryPlanRow> = {}): DiaryPlanRow => ({
  id: "p1", contact_id: "c1", event_id: "e1", occasion_date: "2026-10-03", product_id: "prod-1", gift_name: null, note: null, status: "chosen", order_id: null, created_at: "2026-09-20T10:00:00Z", ...over,
});
const order = (over: Partial<LinkedOrder> = {}): LinkedOrder => ({ id: "o1", orderNumber: "GP-1", status: "confirmed", placedAt: "2026-09-22T10:00:00Z", ...over });

describe("gift plan rules", () => {
  it("orders the steps and finds the next one", () => {
    expect(stepIndex("idea")).toBe(0);
    expect(stepIndex("given")).toBe(4);
    expect(nextStatus("idea")).toBe("chosen");
    expect(nextStatus("wrapped")).toBe("given");
    expect(nextStatus("given")).toBeNull();
  });

  it("counts an order as placed only once it is really paid for", () => {
    expect(isPlacedOrderStatus("created")).toBe(false);
    expect(isPlacedOrderStatus("payment_initiated")).toBe(false);
    expect(isPlacedOrderStatus("cancelled")).toBe(false);
    expect(isPlacedOrderStatus("refunded")).toBe(false);
    expect(isPlacedOrderStatus("confirmed")).toBe(true);
    expect(isPlacedOrderStatus("delivered")).toBe(true);
  });

  it("lifts a chosen plan to ordered when its product was really ordered, and never lowers or overshoots", () => {
    expect(effectivePlanStatus(plan({ status: "chosen" }), order())).toBe("ordered");
    expect(effectivePlanStatus(plan({ status: "idea" }), order())).toBe("ordered");
    expect(effectivePlanStatus(plan({ status: "chosen" }), null)).toBe("chosen");
    expect(effectivePlanStatus(plan({ status: "chosen" }), order({ status: "cancelled" }))).toBe("chosen");
    expect(effectivePlanStatus(plan({ status: "wrapped" }), order())).toBe("wrapped");
    expect(effectivePlanStatus(plan({ status: "given" }), order())).toBe("given");
  });

  it("links only an order that has the product, is paid, and came after the plan", () => {
    const orders = [
      { order: order({ id: "late-cancelled", status: "cancelled" }), productIds: ["prod-1"] },
      { order: order({ id: "other-product" }), productIds: ["prod-9"] },
      { order: order({ id: "before-the-plan", placedAt: "2026-09-01T00:00:00Z" }), productIds: ["prod-1"] },
      { order: order({ id: "good" }), productIds: ["prod-1", "prod-2"] },
    ];
    expect(findLinkedOrder(plan(), orders)?.id).toBe("good");
    expect(findLinkedOrder(plan({ product_id: null }), orders)).toBeNull();
    expect(findLinkedOrder(plan({ product_id: "prod-404" }), orders)).toBeNull();
  });

  it("finds the plan for one occurrence, not another year's", () => {
    const plans = [plan({ id: "this-year" }), plan({ id: "next-year", occasion_date: "2027-10-03" })];
    expect(planFor(plans, "e1", "2026-10-03")?.id).toBe("this-year");
    expect(planFor(plans, "e1", "2027-10-03")?.id).toBe("next-year");
    expect(planFor(plans, "e2", "2026-10-03")).toBeNull();
  });
});
