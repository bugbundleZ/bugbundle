#!/usr/bin/env node
import {
  captureCommand,
  inspectBundle,
  previewProjectFiles,
  verifyBundle,
  writeDefaultConfig,
} from "@bugbundle/core";

const HELP = `BugBundle captures and verifies local bug report artifacts.

Usage:
  bugbundle init [--force]
  bugbundle preview [--json]
  bugbundle capture [--output <file>] -- <command> [arguments...]
  bugbundle inspect <bundle.zip> [--json]
  bugbundle verify <bundle.zip> [--run] [--json]
  bugbundle --help

Security:
  verify validates hashes without executing code. --run explicitly replays the command.
`;

async function main(args: readonly string[]): Promise<number> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }

  if (args[0] === "init") return init(args.slice(1));
  if (args[0] === "preview") return preview(args.slice(1));
  if (args[0] === "capture") return capture(args.slice(1));
  if (args[0] === "inspect") return inspect(args.slice(1));
  if (args[0] === "verify") return verify(args.slice(1));
  process.stderr.write(`Unknown command: ${args[0]}\n\n${HELP}`);
  return 2;
}

async function init(args: readonly string[]): Promise<number> {
  const unknown = args.filter((value) => value !== "--force");
  if (unknown.length > 0) return usageError(`Unknown init option: ${unknown[0]}`);
  const path = await writeDefaultConfig(process.cwd(), args.includes("--force"));
  process.stdout.write(`${path}\n`);
  return 0;
}

async function preview(args: readonly string[]): Promise<number> {
  const unknown = args.filter((value) => value !== "--json");
  if (unknown.length > 0) return usageError(`Unknown preview option: ${unknown[0]}`);
  const result = await previewProjectFiles(process.cwd());
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  for (const file of result.files) process.stdout.write(`${file.bytes}\t${file.path}\n`);
  process.stdout.write(`Files: ${result.files.length}; bytes: ${result.totalBytes}\n`);
  return 0;
}

async function capture(args: readonly string[]): Promise<number> {
  const separator = args.indexOf("--");
  if (separator === -1 || separator === args.length - 1) {
    process.stderr.write("capture requires `-- <command> [arguments...]`\n");
    return 2;
  }
  const options = args.slice(0, separator);
  let outputFile = "bugbundle.zip";
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--output" && options[index + 1]) {
      outputFile = options[index + 1] as string;
      index += 1;
      continue;
    }
    process.stderr.write(`Unknown capture option: ${option}\n`);
    return 2;
  }
  const command = args.slice(separator + 1) as [string, ...string[]];
  const result = await captureCommand({ command, cwd: process.cwd(), outputFile });
  process.stdout.write(`${result.bundlePath}\n`);
  return 0;
}

async function inspect(args: readonly string[]): Promise<number> {
  const bundlePath = args.find((value) => !value.startsWith("-"));
  if (!bundlePath) return usageError("inspect requires <bundle.zip>");
  const result = await inspectBundle(bundlePath);
  writeResult(result, args.includes("--json"));
  return 0;
}

async function verify(args: readonly string[]): Promise<number> {
  const bundlePath = args.find((value) => !value.startsWith("-"));
  if (!bundlePath) return usageError("verify requires <bundle.zip>");
  const run = args.includes("--run");
  const result = await verifyBundle(bundlePath, { run });
  writeResult(result, args.includes("--json"));
  return result.replay && !result.replay.matched ? 1 : 0;
}

function writeResult(result: object, json: boolean): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const value = result as { integrity?: string; manifest?: { files?: readonly unknown[] }; replay?: { matched?: boolean } };
  process.stdout.write(`Integrity: ${value.integrity ?? "unknown"}\n`);
  process.stdout.write(`Files: ${value.manifest?.files?.length ?? 0}\n`);
  if (value.replay) process.stdout.write(`Replay matched: ${String(value.replay.matched)}\n`);
}

function usageError(message: string): number {
  process.stderr.write(`${message}\n`);
  return 2;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`BugBundle failed: ${message}\n`);
    process.exitCode = 1;
  });
