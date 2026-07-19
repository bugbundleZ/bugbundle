import { spawn } from "node:child_process";
import { mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
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

    const jsonError = await run(["unknown", "--json"]);
    expect(jsonError.code).toBe(2);
    expect(JSON.parse(jsonError.stderr)).toEqual({
      error: { code: "USAGE_ERROR", message: "Unknown command: unknown" },
    });

    const unknownOption = await run(["inspect", "bundle.zip", "--unknown", "--json"]);
    expect(unknownOption.code).toBe(2);
    expect(JSON.parse(unknownOption.stderr).error.code).toBe("USAGE_ERROR");

    const extraBundle = await run(["verify", "one.zip", "two.zip", "--json"]);
    expect(extraBundle.code).toBe(2);
    expect(JSON.parse(extraBundle.stderr).error.message).toBe("Unexpected verify argument: two.zip");

    const missingOutput = await run(["capture", "--output", "--json", "--", process.execPath]);
    expect(missingOutput.code).toBe(2);
    expect(JSON.parse(missingOutput.stderr).error.message).toBe("--output requires <file>");
  });

  it("runs init, preview, capture, inspect, and verify as a black box", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-cli-"));
    await writeFile(join(cwd, "package.json"), "{\"name\":\"cli-fixture\"}\n");

    const initialized = await run(["init", "--json"], cwd);
    expect(initialized.code).toBe(0);
    expect(await realpath(JSON.parse(initialized.stdout).configPath)).toBe(await realpath(join(cwd, ".bugbundle.yml")));

    const duplicateInit = await run(["init", "--json"], cwd);
    expect(duplicateInit.code).toBe(1);
    expect(JSON.parse(duplicateInit.stderr).error.code).toBe("RUNTIME_ERROR");
    const preview = await run(["preview", "--json"], cwd);
    expect(preview.code).toBe(0);
    expect(JSON.parse(preview.stdout).files).toHaveLength(2);

    const capture = await run(
      ["capture", "--output", "issue.zip", "--json", "--", process.execPath, "-e", "process.exit(6)"],
      cwd,
    );
    expect(capture.code).toBe(0);
    const captureResult = JSON.parse(capture.stdout);
    expect(await realpath(captureResult.bundlePath)).toBe(await realpath(join(cwd, "issue.zip")));
    expect(captureResult.manifest).toMatchObject({ result: { exitCode: 6 } });
    expect((await run(["inspect", "issue.zip", "--json"], cwd)).code).toBe(0);
    expect((await run(["verify", "issue.zip"], cwd)).code).toBe(0);

    const replay = await run(["verify", "issue.zip", "--run", "--json"], cwd);
    expect(replay.code).toBe(0);
    expect(JSON.parse(replay.stdout).replay).toMatchObject({ exitCode: 6, matched: true });
  });

  it("installs the GitHub adoption files with stable JSON output", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-cli-github-"));
    const initialized = await run(["init", "--github", "--json"], cwd);

    expect(initialized.code).toBe(0);
    const result = JSON.parse(initialized.stdout);
    expect(await realpath(result.configPath)).toBe(await realpath(join(cwd, ".bugbundle.yml")));
    expect(await realpath(result.githubIssueFormPath)).toBe(
      await realpath(join(cwd, ".github", "ISSUE_TEMPLATE", "bug-report.yml")),
    );
    await expect(readFile(result.githubIssueFormPath, "utf8")).resolves.toContain("npx bugbundle@0.2.0 preview");

    const duplicate = await run(["init", "--github", "--json"], cwd);
    expect(duplicate.code).toBe(1);
    expect(JSON.parse(duplicate.stderr).error).toMatchObject({ code: "RUNTIME_ERROR" });
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
