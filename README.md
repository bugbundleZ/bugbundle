# BugBundle

BugBundle captures a failing command as a privacy-safe, executable bug report artifact.

> Early development: the bundle format and CLI are not stable yet.

## Prototype

```bash
pnpm install
pnpm build
node packages/cli/dist/index.js init
node packages/cli/dist/index.js preview
node packages/cli/dist/index.js capture --output bugbundle.zip -- node -e "console.error('failed'); process.exit(1)"
node packages/cli/dist/index.js inspect bugbundle.zip
node packages/cli/dist/index.js verify bugbundle.zip
```

The prototype writes a deterministic ZIP containing a manifest, redacted logs, and an allowlisted set of project metadata files. It never uploads data. `verify` checks file hashes without executing anything; pass `--run` only when you trust the bundle and explicitly want to replay its command.

## File allowlist

`bugbundle init` creates `.bugbundle.yml`. Only matching files can enter a bundle. Run `bugbundle preview` before capture to inspect the exact paths and sizes.

```yaml
schemaVersion: 1
files:
  include:
    - package.json
    - pnpm-lock.yaml
    # Add source files explicitly when they are safe to share:
    # - src/**/*.ts
  exclude:
    - dist/**
    - coverage/**
  maxFiles: 100
  maxFileBytes: 2097152
```

BugBundle always excludes `.git`, `node_modules`, `.env*`, private-key files, and `id_rsa*`, even if an include pattern matches them. Symlinks are not followed. Allowlisted text files are redacted before archiving; non-UTF-8 files are rejected. Modern Bun projects should use the text `bun.lock` format.

## Development

Requires Node.js 22 or 24 and pnpm 11.

```bash
pnpm install
pnpm check
pnpm build
```

See [selection research](docs/selection-research.md) for the product rationale and validation targets.

See [bundle format](docs/bundle-format.md) for the current archive contract and security model.
