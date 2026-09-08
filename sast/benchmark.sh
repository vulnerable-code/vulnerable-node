#!/usr/bin/env bash
# Run a SAST tool on sast/seeds/ and score it against sast/ground-truth.yaml.
#
# Usage: ./sast/benchmark.sh <semgrep|njsscan>
#
# Requires the tool on PATH (python3 -m pip install --user semgrep|njsscan)
# and node for sast/tests/score.js.
set -euo pipefail

TOOL="${1:?usage: $0 <semgrep|njsscan>}"
cd "$(dirname "$0")/.."

out=$(mktemp -t "sast-$TOOL.XXXXXX.json")
trap 'rm -f "$out" "$out.norm"' EXIT

case "$TOOL" in
  semgrep)
    semgrep scan sast/seeds/ --config p/default --json --quiet -o "$out"
    # SARIF-style semgrep JSON already has {"results":[{"path":...}]} — map to {"file":...}
    node -e '
      const fs = require("fs");
      const raw = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const files = [...new Set((raw.results || []).map((r) => r.path || r.file))];
      fs.writeFileSync(
        process.argv[1] + ".norm",
        JSON.stringify({ results: files.map((file) => ({ file })) })
      );
    ' "$out"
    ;;
  njsscan)
    njsscan sast/seeds/ --json -o "$out" || true
    node -e '
      const fs = require("fs");
      const raw = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const files = new Set();
      // njsscan shape: {"nodejs": {rule: {files: [{file_path}]}, ...},
      //                 "templates": {rule: {files: [...]}, ...}}
      for (const section of [raw.nodejs, raw.templates]) {
        for (const r of Object.values(section || {})) {
          for (const f of r.files || []) files.add(f.file_path);
        }
      }
      fs.writeFileSync(
        process.argv[1] + ".norm",
        JSON.stringify({ results: [...files].map((file) => ({ file })) })
      );
    ' "$out"
    ;;
  *)
    echo "unknown tool: $TOOL (expected semgrep|njsscan)" >&2
    exit 1
    ;;
esac

node sast/tests/score.js "$out.norm"