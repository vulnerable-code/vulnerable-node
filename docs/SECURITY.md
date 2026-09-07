# Security policy

This repository is an **intentionally vulnerable application**. Every bug you see in the code — SQL injection, SSRF, path traversal, and the rest of the OWASP Top 10 — was put there on purpose for security training. Run it locally, in Docker, and never expose it to the internet.

**Do not report the intentional vulnerabilities.** They are the product. If you found one, the labs in [`docs/labs/README.md`](labs/README.md) cover it and how to fix it.

## Reporting a real issue

Bugs in the harness itself — the app crashes, the lab docs are wrong, the fix verification is broken — are welcome:

- Email **Daniel Alfocea** at [daniel@danielalfocea.com](mailto:daniel@danielalfocea.com)

## Supported versions

Only the latest `master`. Older tags get nothing.