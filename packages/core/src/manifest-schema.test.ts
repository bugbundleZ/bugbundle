import { describe, expect, it } from "vitest";
import { validateManifest } from "./manifest-schema.js";

const validManifest = {
  schemaVersion: 1,
  command: ["node", "test.js"],
  result: { exitCode: 1, signal: null },
  runtime: { node: "v24.0.0", platform: "linux", arch: "x64" },
  artifacts: { stdout: "logs/stdout.log", stderr: "logs/stderr.log" },
  files: [],
  redactions: 0,
  truncated: { stdout: false, stderr: false },
};

describe("manifest schema", () => {
  it("accepts the version 1 contract", () => {
    expect(validateManifest(validManifest)).toEqual(validManifest);
  });

  it("rejects extra properties and malformed hashes", () => {
    expect(() => validateManifest({ ...validManifest, unexpected: true })).toThrow("additional properties");
    expect(() =>
      validateManifest({
        ...validManifest,
        files: [{ path: "logs/x", bytes: 1, sha256: "bad", kind: "log" }],
      }),
    ).toThrow("pattern");
  });
});
