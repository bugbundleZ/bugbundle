# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses semantic versioning after the initial experimental series.

## [Unreleased]

## [0.1.0] - 2026-07-11

### Added

- deterministic ZIP capture with bounded, redacted stdout and stderr;
- versioned manifest schema and per-entry SHA-256 integrity checks;
- safe `inspect` and non-executing `verify` commands;
- explicit `verify --run` command replay;
- `.bugbundle.yml` file allowlists and `preview` workflow;
- mandatory secret-file, dependency, Git metadata, and symlink exclusions;
- streaming expanded-size enforcement and archive path validation; and
- cross-platform CI plus core and CLI integration tests.
