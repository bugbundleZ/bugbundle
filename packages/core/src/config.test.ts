import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfig, writeDefaultConfig } from "./config.js";
import { previewProjectFiles } from "./project-files.js";

describe("BugBundle configuration", () => {
  it("writes a valid default config without overwriting", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-config-"));
    const path = await writeDefaultConfig(cwd);
    expect(parseConfig(await readFile(path, "utf8"))).toMatchObject({ schemaVersion: 1 });
    await expect(writeDefaultConfig(cwd)).rejects.toMatchObject({ code: "EEXIST" });
  });

  it.each(["../secret", "/etc/passwd", "C:/secret", "folder\\file"])(
    "rejects unsafe include pattern %s",
    (pattern) => {
      expect(() =>
        parseConfig(`schemaVersion: 1\nfiles:\n  include: [${JSON.stringify(pattern)}]\n  exclude: []\n  maxFiles: 10\n  maxFileBytes: 1000\n`),
      ).toThrow("Unsafe file pattern");
    },
  );

  it("previews configured files while enforcing secret exclusions", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-preview-"));
    await writeFile(
      join(cwd, ".bugbundle.yml"),
      "schemaVersion: 1\nfiles:\n  include: ['src/**', '.env']\n  exclude: ['src/skip.ts']\n  maxFiles: 10\n  maxFileBytes: 1000\n",
    );
    await import("node:fs/promises").then(({ mkdir }) => mkdir(join(cwd, "src")));
    await writeFile(join(cwd, "src/keep.ts"), "export {};\n");
    await writeFile(join(cwd, "src/skip.ts"), "secret\n");
    await writeFile(join(cwd, ".env"), "TOKEN=secret\n");

    const preview = await previewProjectFiles(cwd);
    expect(preview.files.map((file) => file.path)).toEqual([".bugbundle.yml", "src/keep.ts"]);
  });
});
