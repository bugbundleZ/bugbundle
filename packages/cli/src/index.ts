#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  captureCommand,
  inspectBundle,
  previewProjectFiles,
  verifyBundle,
  writeDefaultConfig,
  writeGitHubSetup,
} from "@bugbundle/core";

const HELP = `BugBundle captures and verifies local bug report artifacts.

Usage:
  bugbundle init [--github] [--force] [--json]
  bugbundle preview [--json]
  bugbundle capture [--output <file>] [--json] -- <command> [arguments...]
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
  return usageError(`Unknown command: ${args[0]}`, args.includes("--json"), true);
}

async function init(args: readonly string[]): Promise<number> {
  const json = args.includes("--json");
  const unknown = args.filter((value) => value !== "--github" && value !== "--force" && value !== "--json");
  if (unknown.length > 0) return usageError(`Unknown init option: ${unknown[0]}`, json);
  const force = args.includes("--force");
  const result = args.includes("--github")
    ? await writeGitHubSetup(process.cwd(), { force, cliVersion: await readCliVersion() })
    : { configPath: await writeDefaultConfig(process.cwd(), force) };
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${Object.values(result).join("\n")}\n`);
  return 0;
}

async function readCliVersion(): Promise<string> {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
    version?: unknown;
  };
  if (typeof packageJson.version !== "string") throw new Error("BugBundle package version is missing");
  return packageJson.version;
}

async function preview(args: readonly string[]): Promise<number> {
  const json = args.includes("--json");
  const unknown = args.filter((value) => value !== "--json");
  if (unknown.length > 0) return usageError(`Unknown preview option: ${unknown[0]}`, json);
  const result = await previewProjectFiles(process.cwd());
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  for (const file of result.files) process.stdout.write(`${file.bytes}\t${file.path}\n`);
  process.stdout.write(`Files: ${result.files.length}; bytes: ${result.totalBytes}\n`);
  return 0;
}

async function capture(args: readonly string[]): Promise<number> {
  const separator = args.indexOf("--");
  const options = separator === -1 ? args : args.slice(0, separator);
  const json = options.includes("--json");
  if (separator === -1 || separator === args.length - 1) {
    return usageError("capture requires `-- <command> [arguments...]`", json);
  }
  let outputFile = "bugbundle.zip";
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--output") {
      const value = options[index + 1];
      if (!value || value.startsWith("--")) return usageError("--output requires <file>", json);
      outputFile = value;
      index += 1;
      continue;
    }
    if (option === "--json") continue;
    return usageError(`Unknown capture option: ${option}`, json);
  }
  const command = args.slice(separator + 1) as [string, ...string[]];
  const result = await captureCommand({ command, cwd: process.cwd(), outputFile });
  if (json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${result.bundlePath}\n`);
  return 0;
}

async function inspect(args: readonly string[]): Promise<number> {
  const json = args.includes("--json");
  const unknown = args.find((value) => value.startsWith("-") && value !== "--json");
  if (unknown) return usageError(`Unknown inspect option: ${unknown}`, json);
  const positionals = args.filter((value) => !value.startsWith("-"));
  const bundlePath = positionals[0];
  if (!bundlePath) return usageError("inspect requires <bundle.zip>", json);
  if (positionals.length > 1) return usageError(`Unexpected inspect argument: ${positionals[1]}`, json);
  const result = await inspectBundle(bundlePath);
  writeResult(result, json);
  return 0;
}

async function verify(args: readonly string[]): Promise<number> {
  const json = args.includes("--json");
  const unknown = args.find((value) => value.startsWith("-") && value !== "--run" && value !== "--json");
  if (unknown) return usageError(`Unknown verify option: ${unknown}`, json);
  const positionals = args.filter((value) => !value.startsWith("-"));
  const bundlePath = positionals[0];
  if (!bundlePath) return usageError("verify requires <bundle.zip>", json);
  if (positionals.length > 1) return usageError(`Unexpected verify argument: ${positionals[1]}`, json);
  const run = args.includes("--run");
  const result = await verifyBundle(bundlePath, { run });
  writeResult(result, json);
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

function usageError(message: string, json = false, showHelp = false): number {
  writeError("USAGE_ERROR", message, json);
  if (showHelp && !json) process.stderr.write(`\n${HELP}`);
  return 2;
}

function writeError(code: "USAGE_ERROR" | "RUNTIME_ERROR", message: string, json: boolean): void {
  if (json) {
    process.stderr.write(`${JSON.stringify({ error: { code, message } }, null, 2)}\n`);
    return;
  }
  process.stderr.write(`${message}\n`);
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const json = process.argv.slice(2).includes("--json");
    if (json) writeError("RUNTIME_ERROR", message, true);
    else process.stderr.write(`BugBundle failed: ${message}\n`);
    process.exitCode = 1;
  });
