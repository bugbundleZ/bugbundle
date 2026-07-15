import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { assertSafeArchivePath, readArchive, sha256 } from "./archive.js";
import { runCommand } from "./capture.js";
import { validateManifest } from "./manifest-schema.js";
import type { BundleInspection, BundleManifest, VerifyOptions, VerifyResult } from "./types.js";

const decoder = new TextDecoder("utf8", { fatal: true });

export async function inspectBundle(bundlePath: string): Promise<BundleInspection> {
  const absolutePath = resolve(bundlePath);
  const entries = await readArchive(absolutePath);
  const manifestData = entries.get("manifest.json");
  if (!manifestData) throw new Error("Bundle is missing manifest.json");
  const manifest = parseManifest(decoder.decode(manifestData));

  const declaredPaths = new Set<string>();
  for (const file of manifest.files) {
    if (declaredPaths.has(file.path)) throw new Error(`Duplicate manifest path: ${file.path}`);
    declaredPaths.add(file.path);
    const data = entries.get(file.path);
    if (!data) throw new Error(`Bundle is missing declared file: ${file.path}`);
    if (data.byteLength !== file.bytes) throw new Error(`Size mismatch: ${file.path}`);
    if (sha256(data) !== file.sha256) throw new Error(`SHA-256 mismatch: ${file.path}`);
  }

  for (const path of entries.keys()) {
    if (path !== "manifest.json" && !declaredPaths.has(path)) {
      throw new Error(`Bundle contains undeclared file: ${path}`);
    }
  }
  return { bundlePath: absolutePath, manifest, integrity: "valid" };
}

export async function verifyBundle(bundlePath: string, options: VerifyOptions = {}): Promise<VerifyResult> {
  const inspection = await inspectBundle(bundlePath);
  if (!options.run) return inspection;

  const entries = await readArchive(inspection.bundlePath);
  const replayDirectory = options.cwd ? resolve(options.cwd) : await mkdtemp(join(tmpdir(), "bugbundle-replay-"));
  for (const file of inspection.manifest.files.filter((entry) => entry.kind === "project")) {
    const relativePath = file.path.slice("project/".length);
    const destination = join(replayDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    const data = entries.get(file.path);
    if (!data) throw new Error(`Bundle is missing declared file: ${file.path}`);
    await writeFile(destination, data);
  }

  const [storedExecutable, ...args] = inspection.manifest.command;
  const executable = storedExecutable === "{NODE}" ? process.execPath : storedExecutable;
  if (!executable) throw new Error("Bundle command is empty");
  const replay = await runCommand(executable, args, replayDirectory, options.environment, 1024 * 1024);
  return {
    ...inspection,
    replay: {
      exitCode: replay.exitCode,
      signal: replay.signal,
      matched: replay.exitCode === inspection.manifest.result.exitCode && replay.signal === inspection.manifest.result.signal,
    },
  };
}

function parseManifest(json: string): BundleManifest {
  const value = validateManifest(JSON.parse(json));
  for (const file of value.files) {
    assertSafeArchivePath(file.path);
    if (
      (file.kind === "log" && !file.path.startsWith("logs/")) ||
      (file.kind === "project" && !file.path.startsWith("project/"))
    ) {
      throw new Error(`Invalid manifest file kind: ${file.path}`);
    }
  }
  return value;
}
