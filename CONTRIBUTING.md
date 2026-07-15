# Contributing

BugBundle welcomes focused bug reports and pull requests.

## Development

Requirements: Node.js 22 or 24 and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm check
```

Every behavior change needs a fixture or regression test. Changes to collectors or file handling require redaction and path-safety coverage. Changes to `manifest.schema.json` require compatibility discussion because bundles are intended to remain independently verifiable.

Please keep pull requests small, explain the user-visible problem, and describe the command used to verify the change.
