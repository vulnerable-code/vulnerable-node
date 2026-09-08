# Learnings — vulnerable-nodejs

Maintenance notes distilled from working sessions. Open a note when the
symptom in its row shows up.

| Note | When to open it |
|---|---|
| [Delegating to agents in worktrees](#delegating-to-agents-in-worktrees-the-agent-kernel-resolves-relative-paths-against-the-main-checkout) | Agent edits that "revert themselves", files changing on their own across worktrees |
| [GitHub Push Protection and seeded secrets](#github-push-protection-blocks-the-push-even-with-secret-scanning-disabled-the-git-history-secret-lab-has-to-live-with-it) | Push rejected with GH013 / planning a lab that needs real-provider secret patterns |
| [vulnerable-nodejs vs NodeBazaar](#the-project-is-vulnerable-nodejs-nodebazaar-is-just-the-store-inside) | Confusion about project vs store naming, or when renaming the GitHub repo |

---
type: pitfall
date: 2026-09-08
---

# Delegating to agents in worktrees: the agent kernel resolves relative paths against the main checkout

## Symptom

Three agents running in parallel on git worktrees (`feat/dashboard`,
`feat/frontend`, `feat/cleanup`) reported that their edits "reverted
themselves" mid-task (`views/layout.ejs`, `public/css/style.css`,
`README.md`, `docker-compose.yml` lost already-applied changes). The cleanup
agent also left the main checkout's working tree dirty.

## Cause

A subagent's `eval` kernel does not always inherit the worktree `cwd`: when
running Python or commands with relative paths, some agent writes resolved
against `/Users/cr0hn/Projects/vulnerable-node` (the main checkout) instead
of its worktree. The result was "ghost reverts" in both places: the worktree
lost the change and the main checkout received it. Second effect: while
verifying "who referenced what", one agent read `views/products.ejs` in the
main checkout (which no longer used it after the rewrite) instead of its own
updated worktree, and deleted a live view — `routes/shop.js` and
`routes/pages.js` call `res.render("products")`, so `/search` and
`/categories/:slug` returned `500 ENOENT views/products.ejs`.

## Contrast: where it does NOT happen

When the agent works with absolute paths
(`/Users/cr0hn/Dropbox/Projects/vnjs-dashboard/...`) or commits in small
increments, the problem does not appear. The incident repeated for two
agents until they were instructed to commit early and often.

## How it was avoided

1. Explicit instruction in every agent's context: "work ONLY in worktree X,
   NEVER touch the main checkout", with the list of files owned by other
   agents.
2. Re-applying in small commits (`commit in smaller increments`) to catch
   loss before work accumulates.
3. At merge time, audit the main checkout's working tree
   (`git status --short`) and discard with `git checkout -- <file>` any
   change that duplicates what already arrived through the agent's branch.
4. Verify render targets before declaring a view dead:
   `grep -rn "render(\"<view>\"" routes/` decides whether the file lives or
   dies; the name shared between the old and new catalog (`products.ejs`)
   was exactly the trap case.

Verified in the 2026-09-08 session: clean merge of the 4 branches, 17/17
tests green after restoring `views/products.ejs` (commit `07a512c` and
friends).

## What remains open

The pattern is stable but relies on the agent respecting the constraint. If
it recurs with other agents, consider isolating the kernel per agent
(`isolated: true` on spawn) or passing absolute paths in every write
instruction.

---
type: pitfall
date: 2026-09-07
---

# GitHub Push Protection blocks the push even with secret scanning "disabled": the git-history secret lab has to live with it

## Symptom

`git push --force origin master` rejected with `GH013: Repository rule
violations found — GITHUB PUSH PROTECTION`, pointing at
`sast/seeds/hardcoded-secret.js:4` (a Stripe-shaped key `sk_live_...`). The
repo setting said `secret_scanning_push_protection: disabled`, yet the block
applied anyway: push protection for provider patterns (Stripe, AWS, ...)
operates at platform level and does not depend on the repo toggle.

## Cause

The CWE-798 seed used a string matching the real Stripe API key pattern. Push
protection scans the content of ALL commits a push introduces — including
history rewritten by `filter-branch`, and even when the file no longer exists
at HEAD.

## Contrast

`git push` after replacing the string with `FAKE_SEED_KEY_...` (same teaching
value: still a hardcoded secret scanners must find) went through clean.
`git log -S 'sk_live_...'` after `filter-branch` +
`git reflog expire --expire=now --all` + `git gc --prune=now` returns nothing
on reachable refs.

## How it was avoided

1. Seeds and mocks use prefixes that do not match provider patterns:
   `FAKE_SEED_`, `VN-FAKE-`, `IMDS-TOKEN-` (the mock IMDS token passes
   because it does not follow any provider's format).
2. Before pushing rewritten history, rehearse the push locally:
   `git push --dry-run` does NOT run push protection — the only real test is
   the push. Budget one rewrite cycle in case seeded secrets surface.
3. Lab 12 (secret in git history) uses `PIPELINE_TOKEN=VN-FAKE-TOKEN-1234`
   in an early 2026-09-07 commit and still works as a lab: the value is
   recoverable with `git log --all -S 'VN-FAKE'`.

## What remains open

If a lab ever requires a real provider-shaped pattern, the push will only go
through the unblock URL GitHub offers
(`/security/secret-scanning/unblock-secret/...`), using the owner's account.

---
type: decision
date: 2026-09-08
---

# The project is vulnerable-nodejs; NodeBazaar is just the store inside

## Decision

Project name: **vulnerable-nodejs** (Damn Vulnerable Node.js Application).
"NodeBazaar" stays as the name of the fictional store running inside it
(navbar, footer, copy, sample data). The official GitHub subject, verbatim:
"Vulnerable Nodejs — a real shop (NodeBazaar) intentionally full of security
bugs. 14 labs, OWASP Top 10:2025, SAST benchmark. Node.js port of DVWA."

## Rejected alternatives

- **`dvwa-nodejs`**: the intermediate name (2026-09-07). Dropped because the
  project is not a literal DVWA port (it does not replicate its labs or its
  level system); it shares spirit and reference, not format.
- **Renaming the store too** to "DVWA Store" or leaving it nameless:
  dropped — a named store gives realism to the attack scenario; the labs
  lose meaning if the target is called "vulnerable-app".
- **Kebab-case GitHub subject**: the owner fixed "Vulnerable Nodejs" as the
  literal subject; files and prose use `vulnerable-nodejs`.

## Implementation

`package.json`/lock: `vulnerable-nodejs`. Zero occurrences of `dvwa-nodejs`
in live files (grep excluding the CHANGELOG history). The GitHub repo keeps
the name `vulnerable-node` (renaming it is a manual change in the owner's
Settings); pushes work through GitHub's automatic redirect.

## What remains open

If the owner renames the repo on GitHub to `vulnerable-nodejs`, update the
`repository-code` URL in `CITATION.cff` and the absolute links in
README/AUTHORS (GitHub redirects keep them alive meanwhile).