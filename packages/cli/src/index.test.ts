import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const cliPath = fileURLToPath(new URL("../dist/index.js", import.meta.url));

describe("bugbundle CLI", () => {
  it("uses stable exit codes for help and usage errors", async () => {
    await expect(run(["--help"])).resolves.toMatchObject({ code: 0, stderr: "" });
    await expect(run(["unknown"])).resolves.toMatchObject({ code: 2 });
    await expect(run(["capture"])).resolves.toMatchObject({ code: 2 });
  });

  it("runs init, preview, capture, inspect, and verify as a black box", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-cli-"));
    await writeFile(join(cwd, "package.json"), "{\"name\":\"cli-fixture\"}\n");

    expect((await run(["init"], cwd)).code).toBe(0);
    expect((await run(["init"], cwd)).code).toBe(1);
    const preview = await run(["preview", "--json"], cwd);
    expect(preview.code).toBe(0);
    expect(JSON.parse(preview.stdout).files).toHaveLength(2);

    const capture = await run(
      ["capture", "--output", "issue.zip", "--", process.execPath, "-e", "process.exit(6)"],
      cwd,
    );
    expect(capture.code).toBe(0);
    expect((await run(["inspect", "issue.zip", "--json"], cwd)).code).toBe(0);
    expect((await run(["verify", "issue.zip"], cwd)).code).toBe(0);

    const replay = await run(["verify", "issue.zip", "--run", "--json"], cwd);
    expect(replay.code).toBe(0);
    expect(JSON.parse(replay.stdout).replay).toMatchObject({ exitCode: 6, matched: true });
  });
});

async function run(args: readonly string[], cwd = process.cwd()): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
}
