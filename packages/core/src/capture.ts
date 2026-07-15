import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { sha256, writeArchive } from "./archive.js";
import { collectProjectFiles } from "./project-files.js";
import { redactText } from "./redact.js";
import type { BundleFile, BundleManifest, CaptureOptions, CaptureResult } from "./types.js";

const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

export async function captureCommand(options: CaptureOptions): Promise<CaptureResult> {
  const [executable, ...args] = options.command;
  const limit = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  const execution = await runCommand(executable, args, options.cwd, options.environment, limit);
  const stdout = redactText(execution.stdout, homedir());
  const stderr = redactText(execution.stderr, homedir());
  const portableCommand = options.command.map((value, index) =>
    index === 0 && value === process.execPath ? "{NODE}" : value,
  );
  const redactedCommand = portableCommand.map((value) => redactText(value, homedir()));
  const entries = await collectProjectFiles(options.cwd);
  let projectRedactions = 0;
  for (const [path, data] of entries) {
    let text: string;
    try {
      text = new TextDecoder("utf8", { fatal: true }).decode(data);
    } catch {
      throw new Error(`Allowlisted file is not UTF-8 text; exclude it from .bugbundle.yml: ${path}`);
    }
    const redacted = redactText(text, homedir());
    entries.set(path, encoder.encode(redacted.text));
    projectRedactions += redacted.count;
  }
  entries.set("logs/stdout.log", encoder.encode(stdout.text));
  entries.set("logs/stderr.log", encoder.encode(stderr.text));

  const files: BundleFile[] = [...entries.entries()]
    .map(([path, data]) => ({
      path,
      bytes: data.byteLength,
      sha256: sha256(data),
      kind: path.startsWith("logs/") ? "log" as const : "project" as const,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  const manifest: BundleManifest = {
    schemaVersion: 1,
    command: redactedCommand.map((result) => result.text),
    result: { exitCode: execution.exitCode, signal: execution.signal },
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
    artifacts: { stdout: "logs/stdout.log", stderr: "logs/stderr.log" },
    files,
    redactions:
      stdout.count +
      stderr.count +
      projectRedactions +
      redactedCommand.reduce((total, result) => total + result.count, 0),
    truncated: { stdout: execution.stdoutTruncated, stderr: execution.stderrTruncated },
  };
  entries.set("manifest.json", encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`));

  const bundlePath = resolve(options.cwd, options.outputFile);
  await mkdir(dirname(bundlePath), { recursive: true });
  await writeArchive(bundlePath, entries);
  return { manifest, bundlePath };
}

export interface CommandResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly stdoutTruncated: boolean;
  readonly stderrTruncated: boolean;
}

export async function runCommand(
  executable: string,
  args: readonly string[],
  cwd: string,
  environment: NodeJS.ProcessEnv | undefined,
  limit: number,
): Promise<CommandResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(executable, args, {
      cwd,
      env: environment ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout = collect(child.stdout, limit);
    const stderr = collect(child.stderr, limit);
    child.once("error", reject);
    child.once("close", async (exitCode, signal) => {
      const [capturedStdout, capturedStderr] = await Promise.all([stdout, stderr]);
      resolvePromise({
        exitCode,
        signal,
        stdout: capturedStdout.text,
        stderr: capturedStderr.text,
        stdoutTruncated: capturedStdout.truncated,
        stderrTruncated: capturedStderr.truncated,
      });
    });
  });
}

async function collect(stream: NodeJS.ReadableStream, limit: number): Promise<{ text: string; truncated: boolean }> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  let truncated = false;
  for await (const value of stream) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const remaining = Math.max(0, limit - bytes);
    if (chunk.length > remaining) truncated = true;
    if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
    bytes += Math.min(chunk.length, remaining);
  }
  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}
