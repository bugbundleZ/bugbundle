# GitHub adoption kit

This directory is a copy-paste starting point for maintainers who want reproducible, reviewable bug reports from Node.js projects.

1. Run `npx bugbundle init --github` from the repository root. The command refuses to overwrite either generated file unless `--force` is explicit.
2. Review every `files.include` pattern. Add source files only when they are safe and necessary to reproduce failures.
3. Replace the example `npm test` command in `.github/ISSUE_TEMPLATE/bug-report.yml` with the narrowest stable reproduction command for the project.
4. Run the workflow yourself before asking contributors to use it.

You can also copy the files in this directory manually when you want to customize them before installation.

Reporters should run `npx bugbundle@0.2.0 preview`, inspect the complete allowlist, capture the failure, and review the ZIP before attaching it. A BugBundle can still contain sensitive project information that no generic redactor can recognize.

`bugbundle verify` checks archive structure and hashes without executing code. Maintainers should use `verify --run` only for trusted bundles and preferably inside an isolated environment.
