import { describe, expect, it } from "vitest";
import { describeOrderProgress, ORDER_STEPS } from "./order-progress";

describe("describeOrderProgress", () => {
  it("has nothing done while payment is pending", () => {
    const p = describeOrderProgress("created");
    expect(p.completed).toBe(0);
    expect(p.tone).toBe("waiting");
  });
  it("marks placed + confirmed once paid", () => {
    expect(describeOrderProgress("confirmed").completed).toBe(2);
  });
  it("moves forward monotonically through the journey", () => {
    const order = ["created", "confirmed", "processing", "shipped", "delivered"];
    const done = order.map((s) => describeOrderProgress(s).completed as number);
    expect([...done].sort((a, b) => a - b)).toEqual(done);
    expect(done.at(-1)).toBe(ORDER_STEPS.length);
  });
  it("has no progress for a cancelled order", () => {
    const p = describeOrderProgress("cancelled");
    expect(p.completed).toBeNull();
    expect(p.tone).toBe("cancelled");
  });
  it("copes with an unknown status", () => {
    expect(describeOrderProgress("something_new").completed).toBe(0);
  });
});
