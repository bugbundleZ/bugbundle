import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { assertSafeArchivePath, readArchive } from "./archive.js";

describe("assertSafeArchivePath", () => {
  it.each(["../secret", "project/../../secret", "/absolute", "C:/windows", "project\\file"])(
    "rejects unsafe path %s",
    (path) => {
      expect(() => assertSafeArchivePath(path)).toThrow("Unsafe bundle path");
    },
  );

  it("accepts normalized relative paths", () => {
    expect(() => assertSafeArchivePath("project/package.json")).not.toThrow();
  });

  it("stops streaming expansion at the configured limit", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-limit-"));
    const path = join(cwd, "large.zip");
    await writeFile(path, zipSync({ "large.txt": new Uint8Array(1024) }));

    await expect(readArchive(path, { expandedBytes: 100 })).rejects.toThrow("exceeds 100 expanded bytes");
  });
});
