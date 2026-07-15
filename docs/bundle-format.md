# BugBundle format

Status: experimental schema version 1.

The normative JSON Schema ships with `@bugbundle/core` at the export path `@bugbundle/core/manifest.schema.json`. The CLI uses this same schema during inspection and verification.

A BugBundle is a deterministic ZIP archive. Entry names use `/`, are relative, and cannot contain parent traversal segments. Readers must reject absolute paths, drive-letter paths, backslashes, undeclared entries, duplicate manifest paths, and integrity mismatches.

## Entries

- `manifest.json`: bundle metadata and the integrity index;
- `logs/stdout.log`: redacted bounded standard output;
- `logs/stderr.log`: redacted bounded standard error; and
- `project/*`: allowlisted, size-bounded project files.

Every entry except `manifest.json` is declared in `manifest.files` with its path, byte length, SHA-256 digest, and kind. The manifest is serialized as indented UTF-8 JSON with a trailing newline.

These hashes detect corruption and inconsistency inside a bundle. They do not authenticate the person who created it: an attacker able to replace the archive can replace both a file and its manifest digest. Signed provenance is outside schema version 1.

ZIP entries are sorted lexically and use a fixed 1980-01-01 timestamp. This makes repeated captures byte-identical when the command result, runtime metadata, and selected files are identical.

## Verification

`bugbundle verify` performs structural and cryptographic integrity checks only. It does not extract project files or execute the recorded command.

`bugbundle verify --run` is a separate, explicit trust decision. It writes allowlisted project files to a temporary directory and executes the recorded command without a shell. A replay matches when its exit code and terminating signal equal the captured result.

## Limits and exclusions

- compressed archive maximum: 20 MiB;
- expanded archive maximum: 50 MiB;
- configurable file count maximum: 1,000;
- configurable per-file maximum: 10 MiB;
- captured stdout and stderr default maximum: 1 MiB each; and
- mandatory exclusions include environment files, private keys, Git metadata, dependencies, and symlinks.

The reader enforces the compressed-size limit before loading the archive and applies the expanded-size limit while streaming each entry, before allocating the complete expanded archive.
