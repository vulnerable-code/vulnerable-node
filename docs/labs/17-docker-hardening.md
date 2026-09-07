# Lab 17: Docker deployment hardening

Everything inside the app stays vulnerable on purpose. This lab is about the layer *around* it: the shipped `docker-compose.yml` ran the web container as **root**, with a **writable root filesystem** and **full Linux capabilities** — so any RCE in the app (labs 8, 16) lands as root with `CAP_SYS_ADMIN`-grade powers. Hardening the deployment doesn't fix the bugs; it caps the blast radius when one fires.

**OWASP Top 10:2025:** [A05 Security Misconfiguration](https://owasp.org/Top10/2025/) (CWE-250, CWE-1188) / A02 Cryptographic Failures (secrets baked into images)

**Code:** `Dockerfile`, `docker-compose.yml` (`web` service)

## Exploit

1. The "vulnerable" state is the previous compose: root user, writable rootfs, no cap_drop. Confirm who you are inside the container:

```bash
docker compose exec -T web whoami
# root   ← app compromise = root compromise
```

2. Root in a writable container can rewrite anything — including its own entrypoint, and `/etc`:

```bash
docker compose exec -T web sh -c 'echo pwned > /etc/passwd && tail -1 /etc/passwd'
# pwned   ← wrote to /etc with no resistance
```

3. Full capability set is inherited; `capsh --print` shows the drop-off:

```bash
docker compose exec -T web sh -c 'capsh --print | head -2'   # cap_drop: [ALL] → "Current: cap_chown" (empty set)
```

(No `capsh` on slim images? `docker inspect --format '{{.HostConfig.CapDrop}}'` answers instead.)

4. Check the rootfs and what a read-only wall looks like after hardening:

```bash
docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$(docker compose ps -q web)"
# false (before) → true (after)
docker compose exec -T web sh -c 'touch /tmp/x && echo tmp-ok; touch /etc/nope'
# tmp-ok; touch: cannot touch '/etc/nope': Read-only file system
```

## Why it happens

Docker defaults to the image's `USER` (unset → root), a writable overlay filesystem, and the full capability set. Containers are not sandboxed by default — every restriction is opt-in.

## Fix

```dockerfile
# Dockerfile — non-root + reproducible deps + OCI labels
COPY package.json package-lock.json ./
RUN npm ci --omit=dev          # lockfile-pinned, prod-only
COPY . .
RUN chown -R node:node /app
USER node                      # the line that turns "root on pwn" into "user on pwn"
LABEL org.opencontainers.image.title="dvwa-nodejs"   # + source/licenses…
```

```yaml
# docker-compose.yml — web service
read_only: true                      # rootfs: read-only; app only writes to /tmp
tmpfs:
  - /tmp
cap_drop: [ALL]                      # no kernel capabilities at all
security_opt: ["no-new-privileges:true"]   # setuid/setgid blocked
```

## Verify

`bash smoke.sh` (or the CI `smoke` job) builds, waits for `/login` to return 200, asserts `whoami` → `node` and `ReadonlyRootfs` → `true`, then tears down. The app-level labs still work — e.g. lab 15's `curl "http://localhost:8888/download?file=../../db/seed-data.js"` still leaks source; the process is just `node` in a read-only, de-capped box while doing it.