import { readFileSync } from "node:fs";
import { Ajv2020, type AnySchema, type ErrorObject } from "ajv/dist/2020.js";
import type { BundleManifest } from "./types.js";

const schema = JSON.parse(
  readFileSync(new URL("../schema/manifest.schema.json", import.meta.url), "utf8"),
) as AnySchema;
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile<BundleManifest>(schema);

export function validateManifest(value: unknown): BundleManifest {
  if (validate(value)) return value as BundleManifest;
  throw new Error(`Invalid BugBundle manifest: ${formatErrors(validate.errors ?? [])}`);
}

function formatErrors(errors: readonly ErrorObject[]): string {
  return errors
    .slice(0, 5)
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ");
}
