# Lab 09: Debug mode + verbose errors

`DEBUG_ERRORS=1` (set in docker-compose) renders raw exceptions — including SQL text and stack traces — straight into the HTML. The search endpoint returns the database error message for any malformed query.

**OWASP Top 10:2025:** [A02 Security Misconfiguration](https://owasp.org/Top10/2025/) / A10 Mishandling of Exceptional Conditions

**Code:** `config.js` (`debug`), `server.js` (error handler), `routes/shop.js` (`/search`), `views/error.ejs`, `views/products.ejs`

## Exploit 1: SQL error on the page

```bash
curl -s -b cookies.txt "http://localhost:8888/search?q='" | grep -A2 "Query error"
# <pre>unterminated quoted string at or near "''%'" ...
```

The query text leaks schema details and confirms injection (lab 03).

## Exploit 2: stack traces

```bash
curl -s -b cookies.txt "http://localhost:8888/orders?sort=nope" | grep -m1 "pg-pool"
# at /app/node_modules/pg-pool/index.js:45:11 ...
```

Internal paths, library versions, and driver internals — everything an attacker needs to map the stack.

## Why it happens

`DEBUG_ERRORS=1` left enabled in a "shipping" compose. Debug surfaces are for laptops, not deployments. Errors belong to the log, not the response.

## Fix

- `DEBUG_ERRORS=0` in every deployment; fail closed (the code already treats anything but `"1"` as off).
- Render a generic error page with a random correlation id; log the details server-side bound to that id.
- In production, `NODE_ENV=production` and no verbose psql/ORM logging.

## Verify

After the fix, `/search?q='` renders the normal "nothing found" page, and `/orders?sort=nope` returns a generic error with a correlation id.

## Note

Verbose errors are the cheapest info gathering there is — every pentest report has this finding somewhere.