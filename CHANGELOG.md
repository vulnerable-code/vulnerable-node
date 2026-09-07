# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/).


## [2.1.0] - 2026-09-07

Polish pass on the 2.0.0 rewrite: store UX and documentation.

### Added
- Real-store UX: public catalog, guest checkout (orders.user_id nullable), login only for reviews/order history
- Enterprise-grade landing: hero with trust list, category cards, value band, testimonial, story + stats, CTA
- Product detail redesign: buybox with labels above inputs, breadcrumbs, stock chips, star ratings
- Checkout as two-column page with sticky order summary ("Total: whatever you type" — lab 06 visible in the UI)
- Contact page with working log-injection vector (extends lab 10)
- Responsive pass: zero horizontal overflow at 390px on every page; navbar, buybox and grids verified in-browser at 390px/1311px
- New project banner (docs/banner.png), lab docs expanded to numbered walkthrough format, AUTHORS.md

### Fixed
- Navbar `<form>` left open swallowed page forms (login/checkout lost styling)
- Grid blowouts on mobile via minmax(0, …) in every multi-column grid
- Duplicate `.dl` margin overflow; missing `.cats-grid`/`.strip` rules
- Orders table schema restored (`id SERIAL PRIMARY KEY`) after guest-checkout change

## [2.0.0] - 2026-09-07
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