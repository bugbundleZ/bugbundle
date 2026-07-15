import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { unzipSync, zipSync } from "fflate";
import { captureCommand } from "./capture.js";
import { inspectBundle, verifyBundle } from "./verify.js";

describe("BugBundle lifecycle", () => {
  it("captures a deterministic, redacted bundle and verifies integrity", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-"));
    await writeFile(join(cwd, "package.json"), "{\"name\":\"fixture\"}\n");
    const options = {
      command: [process.execPath, "-e", "console.log('ok'); console.error('token=my-secret-token'); process.exit(7)"] as const,
      cwd,
      outputFile: "bundle.zip",
    };
    const first = await captureCommand(options);
    const firstBytes = await readFile(first.bundlePath);
    const second = await captureCommand({ ...options, outputFile: "bundle-2.zip" });
    const secondBytes = await readFile(second.bundlePath);

    expect(first.manifest.result.exitCode).toBe(7);
    expect(first.manifest.redactions).toBe(2);
    expect(firstBytes.equals(secondBytes)).toBe(true);

    const archive = unzipSync(firstBytes);
    expect(Buffer.from(archive["logs/stdout.log"] ?? []).toString()).toBe("ok\n");
    expect(Buffer.from(archive["logs/stderr.log"] ?? []).toString()).toBe("token=[REDACTED_SECRET]\n");
    expect(Buffer.from(archive["project/package.json"] ?? []).toString()).toContain("fixture");
    await expect(inspectBundle(first.bundlePath)).resolves.toMatchObject({ integrity: "valid" });
  });

  it("detects tampering", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-tamper-"));
    const result = await captureCommand({
      command: [process.execPath, "-e", "console.error('original'); process.exit(1)"],
      cwd,
      outputFile: "bundle.zip",
    });
    const archive = unzipSync(await readFile(result.bundlePath));
    archive["logs/stderr.log"] = new TextEncoder().encode("tampered\n");
    await writeFile(result.bundlePath, zipSync(archive));

    await expect(inspectBundle(result.bundlePath)).rejects.toThrow("SHA-256 mismatch");
  });

  it("redacts allowlisted project metadata", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-project-redaction-"));
    await writeFile(join(cwd, "package.json"), "{\"token\":\"token=project-secret\"}\n");
    const result = await captureCommand({
      command: [process.execPath, "-e", "process.exit(1)"],
      cwd,
      outputFile: "bundle.zip",
    });
    const archive = unzipSync(await readFile(result.bundlePath));
    const packageJson = Buffer.from(archive["project/package.json"] ?? []).toString();

    expect(packageJson).not.toContain("project-secret");
    expect(packageJson).toContain("[REDACTED_SECRET]");
  });

  it("replays only when explicitly requested", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "bugbundle-run-"));
    const marker = join(cwd, "marker.txt");
    const result = await captureCommand({
      command: [process.execPath, "-e", `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran'); process.exit(4)`],
      cwd,
      outputFile: "bundle.zip",
    });

    await writeFile(marker, "not-run");
    await verifyBundle(result.bundlePath);
    await expect(readFile(marker, "utf8")).resolves.toBe("not-run");

    const verification = await verifyBundle(result.bundlePath, { run: true, cwd });
    expect(verification.replay).toMatchObject({ exitCode: 4, matched: true });
    await expect(readFile(marker, "utf8")).resolves.toBe("ran");
  });
});
