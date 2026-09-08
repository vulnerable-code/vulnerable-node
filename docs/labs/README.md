# dvwa-nodejs labs

Exploit-and-fix notes for [dvwa-nodejs](https://github.com/cr0hn/vulnerable-node) — the intentionally vulnerable Node.js shop (inside it, the NodeBazaar store), inspired by [DVWA](https://github.com/digininja/DVWA). Findings map to the [OWASP Top 10:2025](https://owasp.org/Top10/2025/).

**Local use only.** Do not expose the stack to the internet.

In code, look for `VULN:` (broken on purpose) and `SAFE:` (how to fix).

## Quick start

```bash
docker compose up --build
```

App: http://localhost:8888 — the catalog is public; you only log in to review or see order history (checkout works as guest too, which is part of the story).

| Username | Password  | Role     |
|----------|-----------|----------|
| alice    | alice123  | customer |
| bob      | bob123    | customer |
| admin    | admin123  | admin    |

Bob's order is `/orders/1`. Test card: `4242 4242 4242 4242`.

## Labs

| # | File | Topic | OWASP 2025 |
|---|------|-------|------------|
| 01 | [01-bola-idor.md](01-bola-idor.md) | IDOR on orders (web + API) | A01 Broken Access Control |
| 02 | [02-ssrf-imds.md](02-ssrf-imds.md) | SSRF to IMDS / vault | A01 / A02 |
| 03 | [03-sqli.md](03-sqli.md) | SQL injection: login, search, sort | A05 Injection |
| 03b | [03b-nosql.md](03b-nosql.md) | NoSQL injection on Mongo filters | A05 Injection |
| 04 | [04-mass-assignment.md](04-mass-assignment.md) | Register/profile with `role=admin` | A06 Insecure Design |
| 05 | [05-xss-token-theft.md](05-xss-token-theft.md) | Stored XSS + token theft | A05 / A07 |
| 06 | [06-price-tamper-checkout.md](06-price-tamper-checkout.md) | Client `amount_cents` | A06 Insecure Design |
| 06b | [06b-csrf.md](06b-csrf.md) | CSRF on profile update | A01 Broken Access Control |
| 07 | [07-jwt-weak-secret.md](07-jwt-weak-secret.md) | Forgeable JWTs (`/api/v1/*`) | A07 Authentication Failures |
| 08 | [08-crypto-pan-storage.md](08-crypto-pan-storage.md) | PAN/CVV at rest | A04 Cryptographic Failures |
| 09 | [09-misconfig-debug.md](09-misconfig-debug.md) | Debug + verbose SQL errors | A02 / A10 |
| 10 | [10-logging-failures.md](10-logging-failures.md) | Passwords in logs + log injection | A09 Logging Failures |
| 11 | [11-poisoned-pipelines.md](11-poisoned-pipelines.md) | Poisoned CI pipelines (Actions + Azure) | A03 / A08 |
| 12 | [12-secrets-in-git.md](12-secrets-in-git.md) | Secret in git history | A02 / A04 |
| 13 | [13-prototype-pollution.md](13-prototype-pollution.md) | Prototype pollution via merge | A08 Software/Data Integrity Failures |
| 14 | [14-redos.md](14-redos.md) | ReDoS: event loop taken down | A05 Injection / availability |
| 15 | [15-path-traversal.md](15-path-traversal.md) | Path traversal on downloads | A01 Broken Access Control (CWE-22) |
| 16 | [16-command-injection.md](16-command-injection.md) | Command injection in ping tool | A05 Injection (CWE-78) |
| 17 | [17-docker-hardening.md](17-docker-hardening.md) | Docker deployment hardening | A05 / A02 |

## Suggested learning path

1. Read [03-sqli.md](03-sqli.md) and break login. It is the gentlest start.
2. Follow the OWASP column: access control (01, 02, 06b), then injection (03, 03b, 05, 14).
3. Design-level bugs (04, 06) show how review matters more than crypto.
4. Finish with supply chain and integrity (11, 12, 13) — the ones most often missed.

Each lab lists the exact file and function to fix. Fix it, restart `web`, and try the exploit again — it must fail.

## Verify your fixes

```bash
npm test              # 13 exploit tests: all must PASS on the vulnerable app
npm run verify:fixes  # inverted harness: exit 0 = you fixed them all
```

`tests/exploits.js` is the single source of truth — one exploit definition per lab, reused by both the test suite and the fix-verification CLI.
## Track your progress

Log in and open **/labs** (the "Labs" link in the navbar) for a live progress
dashboard: one card per lab, and a **Run checks** button that executes the real
exploits from `tests/exploits.js` against the running app — as your own user,
never against anyone else. A couple of the exploits mutate state (04 promotes
your account, 05 posts a review, 06 creates a 1-cent order); the checker
restores your account and deletes the test review afterwards, and nothing runs
until you press the button. Results link to each lab's guide, so the dashboard
doubles as a checklist for the [suggested learning path](#suggested-learning-path).
