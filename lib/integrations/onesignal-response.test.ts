import { describe, expect, it } from "vitest";
import { interpretOneSignalResponse } from "./onesignal-response";

describe("interpretOneSignalResponse (shapes captured from the real API)", () => {
  it("a delivered notification has a non-empty id", () => {
    expect(interpretOneSignalResponse(200, { id: "a1b2c3d4-0000-4000-8000-000000000000", external_id: null })).toBe("sent");
  });
  it("200 with an empty id and 'not subscribed' is NOT a success", () => {
    expect(interpretOneSignalResponse(200, { id: "", errors: ["All included players are not subscribed"] })).toBe("not_subscribed");
  });
  it("an unknown external id is 'nobody to notify', not a failure", () => {
    expect(interpretOneSignalResponse(400, { errors: { invalid_aliases: { external_id: ["x"] } } })).toBe("not_subscribed");
  });
  it("auth errors and junk are failures", () => {
    expect(interpretOneSignalResponse(401, { errors: ["Access denied.  Please include an 'Authorization: ...' header"] })).toBe("failed");
    expect(interpretOneSignalResponse(500, null)).toBe("failed");
    expect(interpretOneSignalResponse(200, {})).toBe("failed");
    expect(interpretOneSignalResponse(200, { id: 5 })).toBe("failed");
  });
});
