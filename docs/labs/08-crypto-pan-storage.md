# Lab 08: PAN and CVV stored in clear text

Orders and payment attempts keep the full card number and CVV verbatim, and the order detail page displays them. PCI DSS forbids storing the CVV *at all* and requires PAN truncation wherever possible.

**OWASP Top 10:2025:** [A04 Cryptographic Failures](https://owasp.org/Top10/2025/)

**Code:** `model/db.js` (`createOrder`, `logPaymentAttempt`), `routes/orders.js` (`/checkout`), `views/order_detail.ejs`, schema `db/init.sql` (`orders.card_number`, `payment_attempts`)

## Exploit

1. Buy anything at **Checkout** — guest is fine — with card `4242 4242 4242 4242`, CVV `123`.

2. Read it back from the database. No key needed: it was never encrypted.

```bash
docker compose exec db psql -U nodebazaar -d nodebazaar \
  -c "SELECT card_number, cvv FROM payment_attempts ORDER BY id DESC LIMIT 1;"
#  card_number     | cvv
# -----------------+-----
#  4242424242424242 | 123
```

3. The UI shows it too: log in (alice) and open `/orders/1` — Bob's order with full PAN and CVV rendered on the page (that is lab 01 doing the access-control part of this crime).

4. Even the "encrypted" versions elsewhere are cosmetic: passwords in `users` are plain text, JWTs are signed with a public secret (lab 07). Nothing in this stack assumes a hostile database reader — which is the assumption every real design must make.

## Why it happens

Convenience: storing the raw card makes refunds and retries easy. It also makes every database leak a carding kit. CVV storage is illegal under PCI DSS **regardless of encryption**.

## Fix

- Never store the CVV. Period.
- Store only `last4` + brand for display; let the payment service provider (PSP) tokenize the card and reference the token for later charges.
- If the PAN must ever touch your system, keep it in a dedicated vault with key management — not in the orders table.
- Mask in every UI and log: `**** **** **** 4242`.

```js
// model/db.js
function createOrder(userId, item) {
  const last4 = item.card_number.replace(/\D/g, "").slice(-4);
  // store { last4, psp_token } — not the PAN
}
```

## Verify

After the fix, `payment_attempts` has no `card_number` column; order pages show `**** 4242`.

## Note

The data layer also has no encryption at rest and plain-text user passwords — same lesson: classify data, then choose storage.