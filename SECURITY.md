# Security policy

## Supported versions

BugBundle is pre-1.0 software. Security fixes are applied to the latest release only.

## Reporting a vulnerability

Do not open a public issue containing secrets, private source code, or an unsafe proof of concept. Until a public security contact is configured, report privately through GitHub's private vulnerability reporting feature on the repository.

Include the affected version, operating system, impact, and the smallest safe reproduction possible. We aim to acknowledge reports within seven days.

## Trust boundary

`bugbundle inspect` and `bugbundle verify` must never execute bundle content. `bugbundle verify --run` executes the recorded command and must only be used for a bundle the operator trusts, ideally inside an isolated environment.

Redaction is defense in depth, not a guarantee that arbitrary project content is safe to disclose. Users must run `bugbundle preview` and review the generated bundle before sharing it.
