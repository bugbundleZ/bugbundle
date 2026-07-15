# Repository guidance

- Keep the core deterministic and usable without network access or an AI model.
- Treat bundle contents as sensitive. New collectors require redaction tests.
- Prefer stable JSON output and explicit exit codes over interactive-only behavior.
- Add fixture or regression coverage for every behavior change.
- Run `pnpm check` and `pnpm build` before handing off changes.
- Do not add telemetry without an explicit public design decision.
