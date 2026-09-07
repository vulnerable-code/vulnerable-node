# SAST benchmark seeds

The original mission of vulnerable-node (2016): measure the quality of static analyzers (SAST) against real Node.js code. This folder keeps that mission isolated from the shop.

`sast/seeds/*.js` are self-contained files. Each contains exactly one vulnerability (or a deliberate clean pair). `sast/ground-truth.yaml` lists the expected finding per seed: file, CWE, and the function that triggers it. Nothing in `seeds/` is meant to run — they are scanner bait.

## Method

1. Run your analyzer on `sast/seeds/` only (not the whole repo — the shop has its own bugs and would muddy the measurement).
2. Collect reported findings with file + line.
3. Match against `ground-truth.yaml`:
   - **TP** (true positive): reported seed matches an expected finding.
   - **FP** (false positive): reported on a `clean-*` seed or nowhere near the expected sink.
   - **FN** (missed): expected finding the tool never reports.
4. Score: `TPR = TP / (TP + FN)`, `FPR = FP / (FP + TP)`. Precision/recall per CWE class tells you which analyzers fit which review phase.

## What the seeds cover

| Seed | CWE | Class |
|------|-----|-------|
| `sqli-concat.js` | CWE-89 | SQL injection |
| `nosql-operator.js` | CWE-943 | NoSQL injection |
| `xss-raw-echo.js` | CWE-79 | XSS |
| `path-traversal.js` | CWE-22 | Path traversal |
| `ssrf-fetch.js` | CWE-918 | SSRF |
| `eval-code.js` | CWE-95 | Code injection |
| `crypto-weak.js` | CWE-327 | Weak crypto |
| `hardcoded-secret.js` | CWE-798 | Hardcoded secret |
| `redos-nested.js` | CWE-1333 | ReDoS |
| `prototype-pollution.js` | CWE-1321 | Prototype pollution |
| `open-redirect.js` | CWE-601 | Open redirect |
| `deserialization.js` | CWE-502 | Unsafe deserialization |
| `clean-parameterized.js` | — | control: safe query building |
| `clean-escaped.js` | — | control: safe output encoding |

A tool that scores well on seeds but misses the same bugs in `routes/` and `model/` is pattern-matching, not analyzing — the shop is the integration test, the seeds are the unit test.

## Scoring helper

`sast/tests/score.js` compares an analyzer's SARIF/JSON output against the ground truth (usage in the file header). CI runs it on every push so the baseline never rots.