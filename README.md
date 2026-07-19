# BugBundle

[![CI](https://github.com/bugbundleZ/bugbundle/actions/workflows/ci.yml/badge.svg)](https://github.com/bugbundleZ/bugbundle/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/bugbundle.svg)](https://www.npmjs.com/package/bugbundle)
[![npm downloads](https://img.shields.io/npm/dm/bugbundle.svg)](https://www.npmjs.com/package/bugbundle)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

BugBundle captures a failing command as a privacy-safe, executable bug report artifact.

It runs locally, requires no account or network connection, and never uploads the bundle. The project is in the experimental `0.x` series, so review release notes before upgrading.

## Quick start

```bash
npx bugbundle init
npx bugbundle preview
npx bugbundle capture --output bugbundle.zip -- npm test
npx bugbundle inspect bugbundle.zip
npx bugbundle verify bugbundle.zip
```

Install it globally if you use it frequently:

```bash
npm install --global bugbundle
```

BugBundle writes a deterministic ZIP containing a manifest, redacted logs, and an allowlisted set of project metadata files. `verify` checks file hashes without executing anything; pass `--run` only when you trust the bundle and explicitly want to replay its command.

Every operational command supports `--json` for scripts and AI tools. Successful results go to stdout, structured errors go to stderr, and exit codes remain stable: `0` for success, `1` for runtime or replay mismatch, and `2` for invalid usage.

```bash
bugbundle capture --json --output bugbundle.zip -- npm test
bugbundle verify --json bugbundle.zip
```

## Adopt it in your project

Install a maintainer-owned policy and GitHub Issue Form in one command:

```bash
npx bugbundle init --github
```

This creates `.bugbundle.yml` and `.github/ISSUE_TEMPLATE/bug-report.yml`. It refuses to overwrite either file unless you explicitly pass `--force`. Review the allowlist and replace the example `npm test` command before publishing the form. The [GitHub adoption kit](examples/github/README.md) documents the generated files and safety checklist.

We are recruiting five Node.js CLI, build-tool, or library maintainers for a hands-on design-partner pilot. [Introduce your repository in the pilot discussion](https://github.com/bugbundleZ/bugbundle/discussions/9).

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

Report bugs and feature requests in [GitHub Issues](https://github.com/bugbundleZ/bugbundle/issues).
