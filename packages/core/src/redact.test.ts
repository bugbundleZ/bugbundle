import { describe, expect, it } from "vitest";
import { redactText } from "./redact.js";

describe("redactText", () => {
  it("redacts common credentials and home paths", () => {
    const result = redactText(
      "token=super-secret-value at /Users/alice/project and sk_1234567890abcdef",
      "/Users/alice",
    );

    expect(result.text).toBe("token=[REDACTED_SECRET] at [HOME]/project and [REDACTED_SECRET]");
    expect(result.count).toBe(3);
  });
});
