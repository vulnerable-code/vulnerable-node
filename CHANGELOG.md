# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [2.0.0] - 2026-09-07

Complete rewrite of the 2016 shop: same mission (real vulnerable Node.js code for analyzer research and training), a real application now.

### Added
- Full storefront: catalog, product pages with reviews, guest checkout with test card, orders, account, admin tools, JSON API under `/api/v1`
- 14 security labs in `docs/labs/` (OWASP Top 10:2025) with exploit walkthroughs and fixes: IDOR/BOLA, SSRF→IMDS→vault, SQLi, NoSQLi, mass assignment, stored XSS + token theft, price tampering, CSRF, forgeable JWTs, PAN/CVV storage, verbose errors, secrets in logs + log injection, poisoned CI pipelines, secret in git history, prototype pollution, ReDoS
- `VULN:` / `SAFE:` comments next to every vulnerable line
- Fake IMDS + vault compose services as real SSRF targets
- Unsafe + hardened CI pipelines for GitHub Actions and Azure DevOps
- `sast/` benchmark: 12 vulnerable + 2 clean seed files, ground-truth manifest, scoring helper (keeps the 2016 mission of measuring analyzer quality)
- Postman collection
- Secret planted in git history (lab 12)

### Changed
- Express 4 on Node 22, EJS templates, plain CSS — no build step
- Docker Compose with Postgres 16, Mongo 7, healthchecks, internal-only mocks
- Catalog is public; login only gates reviews and order history (guest checkout supported)
- Docs in English, MIT-style repo conventions (README, labs, screenshots, Postman)

### Removed
- 2016 experiments (`build_ast.js`, `esprima_example.js`, `dummy.js`, `attacks/*.sh`, `.idea/`)
- Legacy demo videos

## [1.0] - 2016

Original vulnerable-node: minimal Express + EJS + pg-promise shop with real vulnerabilities, built to benchmark security source code analyzers.