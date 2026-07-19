# BugBundle CLI

Capture a failing command as a deterministic, privacy-aware ZIP that maintainers can inspect and verify.

```bash
npx bugbundle init
npx bugbundle preview
npx bugbundle capture --output issue.zip -- npm test
npx bugbundle verify issue.zip
```

Add a `.bugbundle.yml` policy and GitHub Issue Form without overwriting existing files:

```bash
npx bugbundle init --github
```

Verification does not execute code. Replaying a bundle requires the explicit `--run` option. Review files with `bugbundle preview` before sharing an archive.

Use `--json` with `init`, `preview`, `capture`, `inspect`, or `verify` for machine-readable stdout and structured errors on stderr.
