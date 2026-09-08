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

## CI benchmark

[`.github/workflows/sast-benchmark.yml`](../.github/workflows/sast-benchmark.yml) runs the benchmark automatically on every push to `master` (and on demand via *workflow_dispatch*):

- The **semgrep** job scans `sast/seeds/` with `--config p/default`, scores the report with `sast/tests/score.js`, and uploads `semgrep.json` + the score line as artifacts.
- The **njsscan** job does the same, after normalizing njsscan's rule-grouped JSON into the `{"results":[{"file":...}]}` shape score.js accepts.
- The **summary** job collects both and writes a combined TPR/FPR table to the workflow run's *Summary* page. Raw reports are also downloadable as artifacts (`sast-semgrep`, `sast-njsscan`, `sast-benchmark-combined`).

Results land in two places: the **Actions run summary** (markdown table) and the **artifacts** of each run. See the [Actions tab](../../actions/workflows/sast-benchmark.yml).

### Run it locally

```bash
python3 -m pip install --user semgrep   # or: njsscan
./sast/benchmark.sh semgrep             # or: ./sast/benchmark.sh njsscan
```

The script runs the tool on `sast/seeds/` only, normalizes its output, and prints the TP/FN/FP + TPR/FPR line from `sast/tests/score.js`.

### Reference numbers

Baseline captured locally with semgrep 1.176.1 (`p/default`) and njsscan 1.0.0, scoring `sast/seeds/` against `ground-truth.yaml`:

| Tool | TP | FN | FP | TPR | FPR | Missed | False positives |
|------|----|----|----|-----|-----|--------|-----------------|
| semgrep (`p/default`) | 10/12 | 2 | 1 | 0.83 | 0.09 | `nosql-operator.js`, `prototype-pollution.js` | `clean-escaped.js` |
| njsscan | 6/12 | 6 | 1 | 0.50 | 0.14 | `sqli-concat.js`, `nosql-operator.js`, `path-traversal.js`, `ssrf-fetch.js`, `redos-nested.js`, `prototype-pollution.js` | `clean-escaped.js` |

To regenerate after changing seeds or tool versions, run `./sast/benchmark.sh <tool>` locally or trigger the workflow from the Actions tab.
