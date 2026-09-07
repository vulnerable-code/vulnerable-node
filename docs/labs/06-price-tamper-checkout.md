# Lab 06: Price tampering at checkout

Checkout trusts `amount_cents` from the client, so the catalog price is advisory: a 129.00 € keyboard costs one cent.

**OWASP Top 10:2025:** [A06 Insecure Design](https://owasp.org/Top10/2025/)

**Code:** `routes/orders.js` (`/checkout`), `views/checkout.ejs`, `model/db.js` (`createOrder`)

## Exploit

1. Open **Checkout** — no login needed (guest checkout is part of the design).
2. The form ships with product 1 (Mechanical Keyboard MK-ULTRA, 129.00 €).
3. Change **Amount (cents)** from `12900` to `1` (in the form itself, DevTools, or a proxy).
4. Fill shipping and card:

```text
Card:  4242 4242 4242 4242
CVV:   any 3 digits (123)
```

5. Press **Pay now**. The confirmation says:

```text
Order #N confirmed — charged 0.01 € (test card).
```

CLI equivalent, no session at all (guest checkout):

```bash
curl -s -X POST http://localhost:8888/checkout \
  --data "product_id=1" \
  --data "product_name=Mechanical Keyboard MK-ULTRA" \
  --data "quantity=1" \
  --data "amount_cents=1" \
  --data "address=1 Main Street" \
  --data "card_number=4242424242424242" \
  --data "cvv=123" | grep "charged"
```

6. The order row now stores `amount_cents=1` as truth — the books are cooked. Logged-in users see it in `/orders`; guests can still read it back through the IDOR in lab 01.

## Why it happens

The *client* decides money. Price, name, quantity and even the product id travel through attacker-controlled fields, and the server neither recomputes nor verifies. The order summary on the checkout page even says so: "Total — whatever you type".

## Fix

Ignore client amounts. Recompute from catalog prices server-side:

```js
// routes/orders.js
const productId = parseInt(req.body.product_id, 10);
const qty = Math.max(1, parseInt(req.body.quantity, 10) || 1);
const { rows } = await db.pool.query(
  "SELECT name, price_cents FROM products WHERE id = $1", [productId]
);
if (rows.length === 0) return res.status(400).render("error", { message: "Unknown product", error: {} });
const amount = rows[0].price_cents * qty;   // server math, not client math
```

Hiding the field or making it `readonly` does not help — any HTTP client can POST whatever it wants. Never trust `amount`, `price`, `discount` or `currency` from the client, including on payment-provider callbacks (verify the signature, verify the amount). Read `SAFE:` comments in `orders.js`.

## Verify

After the fix, sending `amount_cents=1` still charges 129.00 €.

Related: the same form has no CSRF token — see lab 06b.