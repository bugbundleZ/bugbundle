# Project Selection Research

Date: 2026-07-11

## Objective

Select an open-source developer tool that:

1. solves a recurring maintainer problem;
2. can be developed and maintained primarily by an AI coding agent;
3. has deterministic, automatable acceptance criteria;
4. can reach meaningful external adoption within 90–180 days; and
5. can produce credible evidence for an eventual Codex for Open Source application.

## Program signals

OpenAI's public Codex for Open Source application says it looks for active open-source projects with meaningful usage, broad adoption, or clear ecosystem importance. It also considers evidence of ongoing maintainer work such as pull-request review, issue triage, and release management. There is no published minimum star or download threshold.

This means a new repository is not application-ready merely because its implementation is good. Project selection must optimize for external adoption and visible maintenance activity.

## Candidate comparison

Scores are from 1 (poor) to 5 (strong).

| Candidate | Pain | AI maintainability | Distribution | Competition moat | Platform risk | Total |
|---|---:|---:|---:|---:|---:|---:|
| Executable reproduction bundle generator | 5 | 5 | 4 | 4 | 4 | 22 |
| AI/low-quality PR gate | 5 | 4 | 4 | 2 | 1 | 16 |
| AI coding-agent configuration doctor | 4 | 4 | 4 | 2 | 2 | 16 |
| Release/semver guard | 4 | 5 | 3 | 2 | 4 | 18 |
| Generic environment report CLI | 4 | 5 | 3 | 1 | 4 | 17 |

## Recommended direction

### Working concept: BugBundle

BugBundle turns an incomplete bug report into a privacy-safe, executable reproduction bundle that a maintainer can verify with one command.

The key artifact is not a prose report. It is a portable bundle containing:

- a machine-readable manifest;
- the smallest relevant project/configuration files that can be selected safely;
- sanitized logs and environment facts;
- exact install and reproduction commands;
- expected and actual outcomes;
- an integrity checksum; and
- a verification command that runs locally or in CI/container isolation.

Example target workflow:

```bash
npx bugbundle init
npx bugbundle capture -- npm test
npx bugbundle verify ./bugbundle.zip
```

A maintainer can add a small `.bugbundle.yml` policy to define allowed files, required commands, redaction rules, and reproduction expectations. Contributors run the capture command and attach the generated bundle or repository to an issue.

## Why this is differentiated

`envinfo` already generates broad development-environment reports and is integrated by projects including React Native, Expo, Webpack, Gatsby, Jest, and Apollo Client. Competing with it on environment detection alone would be weak.

Many individual tools implement their own `doctor` or diagnostic command. This validates the need but also makes a generic diagnostic collector insufficient.

The unfilled layer is a project-neutral protocol and toolchain for producing a reproduction that is:

- executable rather than descriptive;
- checked against a maintainer-owned policy;
- privacy-scanned before sharing;
- portable across local and CI environments; and
- capable of proving that the reported failure actually occurs.

## Rejected primary direction: AI PR filtering

Low-quality contributions are a major and current maintainer problem. GitHub publicly acknowledges growing review burden and is adding pull-request limits, access controls, and triage capabilities. The open-source `anti-slop` action already implements dozens of configurable checks and has substantial early adoption.

This space is therefore useful but strategically weak for a new project: it is crowded, politically contentious, and exposed to rapid replacement by native GitHub features. BugBundle can still help with the same problem by requiring evidence from every contribution without attempting to classify whether a human or AI wrote it.

## AI-first maintainability test

BugBundle is suitable for AI-led maintenance because nearly every change can have an executable oracle:

- fixture repositories test framework and package-manager detection;
- golden snapshots test manifest/report generation;
- adversarial fixtures test secret and path redaction;
- containerized matrices test Linux/runtime compatibility;
- property tests check archive determinism and path safety;
- end-to-end tests prove capture and replay behavior; and
- performance budgets constrain bundle size and capture time.

The project should avoid an AI chat UI in its core. Optional model-assisted log analysis can be added later, but correctness must not depend on subjective model output.

## Initial scope

The first release should support Node.js repositories only:

1. npm, pnpm, yarn, and bun project detection;
2. allowlist-based file collection;
3. deterministic manifest and ZIP generation;
4. secret, username, hostname, and home-path redaction;
5. command capture with exit code and bounded stdout/stderr;
6. local bundle inspection before export; and
7. bundle verification on Linux and macOS.

Windows support and automatic project minimization should follow after the bundle format stabilizes.

## Adoption path

The distribution unit is a copy-paste integration for maintainers:

- a `.bugbundle.yml` file;
- a GitHub Issue Form snippet;
- a GitHub Action that verifies attached/published reproduction artifacts; and
- framework-specific presets maintained in the same repository.

The first adoption target should be small-to-medium Node.js CLI and build-tool projects, where environment-sensitive issues are common and maintainers are reachable. The project should seek design partners before building automatic minimization.

## 90-day validation gates

Continue investment only if the project reaches evidence such as:

- 5 external repositories installing the workflow;
- 20 real reproduction bundles created;
- 3 maintainer testimonials or linked resolved issues;
- at least 1 external contributor; and
- recurring releases with public issue/PR activity.

If maintainers like the idea but contributors will not run the command, pivot the interface toward a GitHub App/Action while retaining the bundle protocol.

## Main risks

1. **Contributor friction:** asking reporters to install and run another CLI may reduce completion.
2. **Security liability:** incomplete redaction could expose secrets or personal data.
3. **Scope explosion:** true automatic minimization is language- and framework-specific.
4. **Cold start:** maintainers will not configure a policy until the tool demonstrates value.

Mitigations are preview-before-export, strict allowlists, a versioned open bundle specification, Node-only initial scope, and ready-made presets requiring minimal configuration.

## Decision

Proceed with BugBundle as an executable reproduction protocol and CLI. Treat the name as provisional until the repository and npm package are reserved.

## Phase-two findings

### Naming

The original `reprokit` name cannot be used: an npm package at version 0.2.0 already describes itself as capturing production error context and replaying bugs locally. This is both a registry collision and a product-positioning collision.

`bugbundle` was unclaimed on npm and had no exact-name GitHub repository in checks performed on 2026-07-11. The name is short, pronounceable, and describes the artifact rather than promising automatic bug minimization. `ReproProof`, `ReproMint`, `ReproVault`, and `ReproSpec` were also technically available, but are either less immediately understandable or imply stronger proof/security guarantees than the initial product can provide.

### Public issue evidence

The sampled issues reveal a repeated workflow across Vite, Vitest, Astro, Biome, Next.js, Vue, Flutter, Gradio, and AWS CDK:

1. a reporter provides prose, logs, or a full private application;
2. the maintainer requests a minimal public reproduction;
3. a bot applies a `needs reproduction` label;
4. the issue is often closed after roughly three days without a valid reproduction; and
5. when a valid reproduction arrives, maintainers can frequently diagnose the issue quickly.

The strongest product examples are:

- Biome supplies a project-specific reproduction generator; once the reporter used it, the maintainer identified carriage-return line endings as the cause.
- Vite and Vitest automatically close inactive issues marked as needing reproduction after three days.
- Astro's automated triage explicitly skipped executable analysis when the reproduction URL was invalid.
- Gradio shows the privacy barrier: a reporter needed time to extract the problem from company code before sharing it.
- Vue shows that performance and memory bugs are particularly hard to reduce manually even after users spend significant time investigating.

This supports a product focused on safe extraction and executable verification. A generic form validator would not solve the hard part.

## Technical decision

Use a TypeScript ESM monorepo targeting Node.js 22 and 24 LTS, with Node.js 24 as the development baseline. Node.js 20 is already end-of-life as of 2026, so it should not be a supported baseline.

Initial packages:

- `bugbundle`: the public CLI; and
- `@bugbundle/core`: manifest, capture, redaction, archive, and verification APIs.

Add `@bugbundle/spec` only when external integrations require a separate schema package. Do not create a web application or GitHub App initially.

Engineering defaults:

- pnpm workspaces for repository management;
- strict TypeScript;
- select Node's built-in test runner or Vitest through a short proof of concept, favoring clearer fixture and snapshot ergonomics;
- JSON Schema as the public manifest contract;
- deterministic ZIP output with normalized timestamps and paths;
- no telemetry in v0.x;
- GitHub Actions on Linux, macOS, and Windows; and
- npm trusted publishing with provenance once the package is published.

The CLI must remain non-interactive by default for agent and CI compatibility. Interactive preview can be an optional layer over stable JSON output and exit codes.

## MVP acceptance contract

The first usable release is complete only when automated tests demonstrate all of the following:

1. capturing a failing Node command produces a deterministic bundle;
2. verifying that bundle reproduces the expected non-zero exit and selected output signature;
3. configured secrets and common credential patterns do not appear in the archive;
4. absolute home paths are replaced consistently without breaking replay paths;
5. unsafe archive paths and symlinks are rejected;
6. users can inspect the complete file list and redaction summary before export; and
7. the same fixture works on Linux, macOS, and Windows.
