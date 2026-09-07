// Scoring helper: compare an analyzer report against sast/ground-truth.yaml.
//
// Usage:
//   node sast/tests/score.js <report.sarif.json>     (SARIF format)
//   node sast/tests/score.js <report.json>           ({"results": [{"file": "...", ...}]})
//
// Prints TPs, FPs, FNs and TPR/FPR per CWE class.

const fs = require("fs");
const path = require("path");

function loadGroundTruth() {
  const raw = fs.readFileSync(path.join(__dirname, "..", "ground-truth.yaml"), "utf8");
  const entries = [...raw.matchAll(/- file: (\S+)\n(?:.*\n)*?    sink: (\S+)/g)];
  const seeds = entries.map(([, file, sink]) => ({ file: `sast/seeds/${file}`, sink }));
  const clean = [...raw.matchAll(/clean[-\w]*\.js/g)].map((m) => `sast/seeds/${m[0]}`);
  return { seeds, clean: [...new Set(clean)] };
}

function loadReport(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (data.runs) {
    // SARIF
    const out = [];
    for (const run of data.runs) {
      const uris = run.results?.map((r) => r.locations?.[0]?.physicalLocation?.artifactLocation?.uri) || [];
      for (const uri of uris) out.push(uri);
    }
    return [...new Set(out)];
  }
  return [...new Set((data.results || []).map((r) => r.file))];
}

const { seeds, clean } = loadGroundTruth();
const reported = new Set(loadReport(process.argv[2]).map((f) => f.replace(/\\/g, "/")));

let tp = 0;
const fns = [];
for (const s of seeds) {
  if (reported.has(s.file)) tp++;
  else fns.push(s.file);
}
const fps = [...reported].filter((f) => clean.includes(f) || (!seeds.some((s) => s.file === f) && f.includes("seeds/")));

console.log(`TP: ${tp}/${seeds.length}   FN: ${fns.length}   FP: ${fps.length}`);
if (fns.length) console.log("missed:", fns.join(", "));
if (fps.length) console.log("false positives:", fps.join(", "));
console.log(`TPR = ${(tp / seeds.length).toFixed(2)}   FPR = ${tp + fps.length ? (fps.length / (tp + fps.length)).toFixed(2) : "0.00"}`);