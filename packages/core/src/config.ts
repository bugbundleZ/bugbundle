import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export const CONFIG_FILE = ".bugbundle.yml";

const DEFAULT_INCLUDE = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "tsconfig.json",
  "vite.config.{js,mjs,ts}",
  "vitest.config.{js,mjs,ts}",
] as const;

const DEFAULT_EXCLUDE = ["node_modules/**", ".git/**", "dist/**", "coverage/**"] as const;

export interface BugBundleConfig {
  readonly schemaVersion: 1;
  readonly files: {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
    readonly maxFiles: number;
    readonly maxFileBytes: number;
  };
}

export function defaultConfig(): BugBundleConfig {
  return {
    schemaVersion: 1,
    files: {
      include: [...DEFAULT_INCLUDE],
      exclude: [...DEFAULT_EXCLUDE],
      maxFiles: 100,
      maxFileBytes: 2 * 1024 * 1024,
    },
  };
}

export async function loadConfig(cwd: string): Promise<BugBundleConfig> {
  try {
    const source = await readFile(join(cwd, CONFIG_FILE), "utf8");
    return parseConfig(source);
  } catch (error) {
    if (isMissingFile(error)) return defaultConfig();
    throw error;
  }
}

export function parseConfig(source: string): BugBundleConfig {
  const value: unknown = parse(source);
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.files)) {
    throw new Error("Invalid .bugbundle.yml: expected schemaVersion 1 and files mapping");
  }
  const { include, exclude, maxFiles, maxFileBytes } = value.files;
  if (
    !isStringArray(include) ||
    !isStringArray(exclude) ||
    !isPositiveInteger(maxFiles) ||
    !isPositiveInteger(maxFileBytes)
  ) {
    throw new Error("Invalid .bugbundle.yml file selection settings");
  }
  for (const pattern of [...include, ...exclude]) assertSafeGlob(pattern);
  if (include.length === 0) throw new Error("Invalid .bugbundle.yml: files.include cannot be empty");
  if (maxFiles > 1000) throw new Error("Invalid .bugbundle.yml: maxFiles cannot exceed 1000");
  if (maxFileBytes > 10 * 1024 * 1024) {
    throw new Error("Invalid .bugbundle.yml: maxFileBytes cannot exceed 10485760");
  }
  return { schemaVersion: 1, files: { include, exclude, maxFiles, maxFileBytes } };
}

export async function writeDefaultConfig(cwd: string, force = false): Promise<string> {
  const path = join(cwd, CONFIG_FILE);
  const flag = force ? "w" : "wx";
  await writeFile(
    path,
    `# BugBundle only includes files that match this explicit allowlist.\n` +
      `# Add source patterns only after reviewing them with: bugbundle preview\n` +
      `schemaVersion: 1\n` +
      `files:\n` +
      `  include:\n` +
      DEFAULT_INCLUDE.map((pattern) => `    - ${pattern}\n`).join("") +
      `  exclude:\n` +
      DEFAULT_EXCLUDE.map((pattern) => `    - ${pattern}\n`).join("") +
      `  maxFiles: 100\n` +
      `  maxFileBytes: 2097152\n`,
    { encoding: "utf8", flag },
  );
  return path;
}

function assertSafeGlob(pattern: string): void {
  if (
    pattern.length === 0 ||
    pattern.startsWith("/") ||
    pattern.startsWith("\\") ||
    /^[A-Za-z]:/.test(pattern) ||
    pattern.includes("\\") ||
    pattern.split("/").some((segment) => segment === "..")
  ) {
    throw new Error(`Unsafe file pattern: ${pattern}`);
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
