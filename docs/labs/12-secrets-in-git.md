# Lab 12: Secret still in git history

An early commit of this repo added a `.env` with a fake pipeline token. A later commit deleted the file. Deletion does nothing to history: the value is still one `git log` away.

**OWASP Top 10:2025:** [A02 Security Misconfiguration](https://owasp.org/Top10/2025/) / [A04 Cryptographic Failures](https://owasp.org/Top10/2025/)

## Exploit

```bash
git clone https://github.com/cr0hn/vulnerable-node
cd vulnerable-node

git log -p --all -S 'VN-FAKE' -- .env
# commit <early>: adds .env
# +PIPELINE_TOKEN=VN-FAKE-TOKEN-1234

# or directly from the dangling object:
git show <early-commit>:.env
```

No access to the app needed — read-only repo access leaks the "secret". Anything in history is public forever.

## Why it happens

Secrets get committed during setup, then someone "removes" them. Git keeps every blob; GitHub keeps unreachable objects accessible via API for a long time. Rotation is the only real fix after exposure.

## Fix

1. **Rotate the exposed secret first** — rewriting history without rotation protects nothing.
2. Then rewrite if you must (BFG or `git filter-repo`), force-push, and contact GitHub support to purge cached views.
3. Prevent: `.env` in `.gitignore` (this repo does it now), pre-commit scanning (gitleaks, trufflehog) in CI, secret manager instead of files.

## Verify

```bash
git log -p --all -S 'VN-FAKE' -- .env   # finds it — that is the lab
```

After a real rotation, the found value is worthless: the lesson is *history is forever, rotation is the remedy*.

## Note

Search for more: `git log --all -S 'VN-'` also catches the vault secret pattern used in lab 02's mock (`VN-...` values are all fake).