# GitHub adoption kit

This directory is a copy-paste starting point for maintainers who want reproducible, reviewable bug reports from Node.js projects.

1. Copy `.bugbundle.yml` to the repository root.
2. Review every `files.include` pattern. Add source files only when they are safe and necessary to reproduce failures.
3. Copy `bug-report.yml` to `.github/ISSUE_TEMPLATE/bug-report.yml`.
4. Replace the example `npm test` command with the narrowest stable reproduction command for the project.
5. Run the workflow yourself before asking contributors to use it.

Reporters should run `npx bugbundle@0.2.0 preview`, inspect the complete allowlist, capture the failure, and review the ZIP before attaching it. A BugBundle can still contain sensitive project information that no generic redactor can recognize.

`bugbundle verify` checks archive structure and hashes without executing code. Maintainers should use `verify --run` only for trusted bundles and preferably inside an isolated environment.
