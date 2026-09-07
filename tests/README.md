# NodeBazaar lab tests

Exploit/fix verification harness for the intentionally vulnerable NodeBazaar
shop. The suite documents BOTH sides of each lab:

- **Vulnerable build** (`npm test`): every documented exploit SUCCEEDS. This
  pins the lab — if someone accidentally fixes the code, the test goes red and
  the training app is no longer teaching what docs/labs claim.
- **Fixed build** (`npm run verify:fixes`): the same exploits must FAIL.
  Apply your fix, run the harness, get exit 0 when every lab is closed.

One source of truth: `tests/exploits.js` exports each lab as
`labId → { name, run(ctx) → { exploited, detail } }`. Both consumers run the
exact same HTTP attacks; only the expected outcome differs.

## Running

```bash
# 1. Start the vulnerable stack (app listens on http://localhost:8888)
docker compose up -d --build

# 2. Document the labs: all tests must PASS on the vulnerable build
npm test

# 3. After applying fixes, verify the exploits are dead
npm run verify:fixes      # exit 0 = all fixed, 1 = still vulnerable
```

Override the target with `APP_URL` (e.g. `APP_URL=http://localhost:8899 npm test`).
Requires Node 20+ (uses the built-in `node --test` runner and global `fetch`).
The JWT lab signs a token with `jsonwebtoken` from the app's own node_modules.

## What each test documents

| Lab | Test id | Exploit |
|-----|---------|---------|
| 01 BOLA/IDOR | `01-idor` | `GET /orders/1` as `alice` returns bob's order incl. full PAN `4242…` |
| 05 SQLi (login) | `03-sqli-login` | `username=admin'--` logs in as admin without a password |
| 05 SQLi (UNION) | `03b-sqli-union` | `/search?q=' UNION SELECT …FROM users--` dumps plaintext passwords |
| 05 NoSQL injection | `03c-nosql-meta` | `/api/meta?origin[$ne]=null` returns every Mongo doc (12) |
| 05 Stored XSS | `05-xss` | Review body `<script>…</script>` renders raw on `/products/2` |
| 06 Mass assignment | `04-mass-assignment` | `POST /account` with `role=admin` promotes alice (reset to `customer` after, so reruns stay green) |
| 06 Price tampering | `06-price-tamper` | Guest checkout with `amount_cents=1` → "charged 0.01 €" |
| 07 JWT weak secret | `07-jwt-forge` | Token signed with the committed `jwt-super-secret` authenticates as bob on `/api/v1/me` |
| 09 Verbose errors | `09-verbose-errors` | `/orders?sort=nope` renders the raw Postgres error ("does not exist") |
| 10 Log injection | `10-log-injection` | `/contact` message with CRLF is accepted and logged verbatim (HTTP-side assertion only) |
| 13 Prototype pollution | `13-proto-pollution` | `POST /preferences` with `{"__proto__":{…}}` is accepted — the naive merge writes the key onto `Object.prototype` (in-process effect, see note below) |
| 15 Path traversal | `15-path-traversal` | `/download?file=../../db/seed-data.js` serves app source |
| 16 Command injection | `16-command-injection` | Ping host `127.0.0.1" ; cat /etc/passwd ; #` breaks out of the shell quoting |

Payloads are intentionally not always the doc examples verbatim: the command
injection must escape the double quotes the route adds around `host`
(`docs/labs/16-command-injection.md` shows the plain `;` form, which `sh`
keeps inside the quotes), and the UNION payload uses an `ARRAY['v']` literal
for the `tags text[]` column.

Lab 13 caveat: the prototype pollution genuinely happens (verified in-process —
`merge({}, {"__proto__":{…}})` sets the key on `Object.prototype`), but this app never
reflects inherited properties over HTTP, so the exploit cannot be confirmed from the
response body. The test asserts the endpoint accepts the payload; after applying the
documented fix, `npm run verify:fixes` reports this lab as `WARN` (not verifiable over
HTTP) — confirm the fix with a unit test against `model/merge.js` instead.

## Files

- `tests/helpers.js` — `baseUrl` (`APP_URL` env, default `http://localhost:8888`), `login()`, `get()`, `postForm()`, `postJson()`
- `tests/exploits.js` — the exploit map (single source of truth)
- `tests/labs.test.js` — node:test suite asserting `exploited === true`
- `scripts/verify-fix.js` — CLI asserting `exploited === false`, exit 0/1/2 (2 = app unreachable)

## Verify-fix workflow

1. Pick a lab in `docs/labs/`, read its **SAFE:** note and the `SAFE:` comment
   next to the vulnerable code in `routes/` / `model/`.
2. Apply the fix (e.g. parameterize the query, allowlist the sort column).
3. `npm run verify:fixes` — that lab flips to `PASS  <id>: exploit blocked`.
4. `npm test` now FAILS for that lab on purpose; that is the expected state
   while the app is half-fixed. When all labs are fixed, the suite is red and
   the harness is green — swap your CI to run `verify:fixes` instead.