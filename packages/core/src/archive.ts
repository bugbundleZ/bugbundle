import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Unzip, UnzipInflate, zipSync, type Zippable } from "fflate";

const MAX_ARCHIVE_BYTES = 20 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 50 * 1024 * 1024;
const ZIP_EPOCH = new Date(1980, 0, 1, 0, 0, 0, 0);

export function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function writeArchive(path: string, entries: ReadonlyMap<string, Uint8Array>): Promise<void> {
  const zippable: Zippable = {};
  for (const name of [...entries.keys()].sort(comparePaths)) {
    const data = entries.get(name);
    if (!data) throw new Error(`Missing archive entry: ${name}`);
    assertSafeArchivePath(name);
    zippable[name] = [data, { mtime: ZIP_EPOCH }];
  }
  await writeFile(path, zipSync(zippable, { level: 9 }));
}

interface ArchiveReadLimits {
  readonly compressedBytes?: number;
  readonly expandedBytes?: number;
}

export async function readArchive(path: string, limits: ArchiveReadLimits = {}): Promise<Map<string, Uint8Array>> {
  const absolutePath = resolve(path);
  const metadata = await stat(absolutePath);
  const compressedLimit = limits.compressedBytes ?? MAX_ARCHIVE_BYTES;
  const expandedLimit = limits.expandedBytes ?? MAX_EXPANDED_BYTES;
  if (metadata.size > compressedLimit) {
    throw new Error(`Bundle exceeds ${compressedLimit} compressed bytes`);
  }
  const compressed = await readFile(absolutePath);
  const entries = new Map<string, Uint8Array>();
  let expandedBytes = 0;
  let failure: Error | undefined;
  const seenNames = new Set<string>();
  const unzip = new Unzip((file) => {
    if (failure) return;
    try {
      assertSafeArchivePath(file.name);
      if (seenNames.has(file.name)) throw new Error(`Duplicate bundle entry: ${file.name}`);
      seenNames.add(file.name);
      if (file.originalSize !== undefined && expandedBytes + file.originalSize > expandedLimit) {
        throw new Error(`Bundle exceeds ${expandedLimit} expanded bytes`);
      }
      const chunks: Uint8Array[] = [];
      let fileBytes = 0;
      file.ondata = (error, data, final) => {
        if (failure) return;
        if (error) {
          failure = error;
          return;
        }
        expandedBytes += data.byteLength;
        fileBytes += data.byteLength;
        if (expandedBytes > expandedLimit) {
          failure = new Error(`Bundle exceeds ${expandedLimit} expanded bytes`);
          file.terminate();
          return;
        }
        chunks.push(data);
        if (final) {
          const combined = new Uint8Array(fileBytes);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.byteLength;
          }
          entries.set(file.name, combined);
        }
      };
      file.start();
    } catch (error) {
      failure = error instanceof Error ? error : new Error(String(error));
    }
  });
  unzip.register(UnzipInflate);

  const chunkBytes = 64 * 1024;
  for (let offset = 0; offset < compressed.byteLength && !failure; offset += chunkBytes) {
    const end = Math.min(offset + chunkBytes, compressed.byteLength);
    unzip.push(compressed.subarray(offset, end), end === compressed.byteLength);
  }
  if (failure) throw failure;
  return entries;
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function assertSafeArchivePath(path: string): void {
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.startsWith("\\") ||
    /^[A-Za-z]:/.test(path) ||
    path.split(/[\\/]/).some((segment) => segment === "..") ||
    path.includes("\\")
  ) {
    throw new Error(`Unsafe bundle path: ${path}`);
  }
}
