import type { BugBundleConfig as Config } from "./config.js";

export type BugBundleConfig = Config;

export interface CaptureOptions {
  readonly command: readonly [string, ...string[]];
  readonly cwd: string;
  readonly outputFile: string;
  readonly maxOutputBytes?: number;
  readonly environment?: NodeJS.ProcessEnv;
}

export interface BundleFile {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly kind: "log" | "project";
}

export interface BundleManifest {
  readonly schemaVersion: 1;
  readonly command: readonly string[];
  readonly result: {
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
  };
  readonly runtime: {
    readonly node: string;
    readonly platform: NodeJS.Platform;
    readonly arch: string;
  };
  readonly artifacts: {
    readonly stdout: "logs/stdout.log";
    readonly stderr: "logs/stderr.log";
  };
  readonly files: readonly BundleFile[];
  readonly redactions: number;
  readonly truncated: {
    readonly stdout: boolean;
    readonly stderr: boolean;
  };
}

export interface CaptureResult {
  readonly manifest: BundleManifest;
  readonly bundlePath: string;
}

export interface BundleInspection {
  readonly bundlePath: string;
  readonly manifest: BundleManifest;
  readonly integrity: "valid";
}

export interface VerifyOptions {
  readonly run?: boolean;
  readonly cwd?: string;
  readonly environment?: NodeJS.ProcessEnv;
}

export interface VerifyResult extends BundleInspection {
  readonly replay?: {
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly matched: boolean;
  };
}
