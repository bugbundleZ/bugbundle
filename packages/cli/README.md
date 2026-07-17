# BugBundle CLI

Capture a failing command as a deterministic, privacy-aware ZIP that maintainers can inspect and verify.

```bash
npx bugbundle init
npx bugbundle preview
npx bugbundle capture --output issue.zip -- npm test
npx bugbundle verify issue.zip
```

Verification does not execute code. Replaying a bundle requires the explicit `--run` option. Review files with `bugbundle preview` before sharing an archive.

Use `--json` with `init`, `preview`, `capture`, `inspect`, or `verify` for machine-readable stdout and structured errors on stderr.
