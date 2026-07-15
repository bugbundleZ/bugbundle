import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";
import glob from "fast-glob";
import { CONFIG_FILE, loadConfig, type BugBundleConfig } from "./config.js";

const ALWAYS_EXCLUDED = [
  "node_modules/**",
  ".git/**",
  ".env",
  ".env.*",
  "**/*.pem",
  "**/*.key",
  "**/id_rsa*",
] as const;

export interface ProjectFilePreview {
  readonly config: BugBundleConfig;
  readonly files: readonly {
    readonly path: string;
    readonly bytes: number;
  }[];
  readonly totalBytes: number;
}

export async function previewProjectFiles(cwd: string): Promise<ProjectFilePreview> {
  const config = await loadConfig(cwd);
  const matches = await glob([...config.files.include, CONFIG_FILE], {
    cwd,
    dot: true,
    followSymbolicLinks: false,
    ignore: [...ALWAYS_EXCLUDED, ...config.files.exclude],
    onlyFiles: true,
    unique: true,
  });
  const files: { path: string; bytes: number }[] = [];
  for (const path of matches.sort()) {
    const metadata = await lstat(join(cwd, path));
    if (!metadata.isFile() || metadata.isSymbolicLink()) continue;
    if (metadata.size > config.files.maxFileBytes) continue;
    files.push({ path, bytes: metadata.size });
  }
  if (files.length > config.files.maxFiles) {
    throw new Error(`File allowlist matched ${files.length} files; configured maximum is ${config.files.maxFiles}`);
  }
  return {
    config,
    files,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
  };
}

export async function collectProjectFiles(cwd: string): Promise<Map<string, Uint8Array>> {
  const preview = await previewProjectFiles(cwd);
  const files = new Map<string, Uint8Array>();
  for (const file of preview.files) {
    files.set(`project/${file.path}`, await readFile(join(cwd, file.path)));
  }
  return files;
}
