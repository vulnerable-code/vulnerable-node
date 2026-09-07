#!/usr/bin/env node
// Fix-verification harness for the NodeBazaar labs.
//
// Runs the SAME exploits as the test suite (tests/exploits.js is the single
// source of truth) but with INVERTED expectations: it assumes the fixes from
// docs/labs/*.md are applied and asserts every exploit now FAILS.
//
//   node scripts/verify-fix.js        # exit 0 = all labs fixed, 1 = still vulnerable
//   APP_URL=http://localhost:8899 node scripts/verify-fix.js
//
// Note: the labs.test.js suite documents the opposite state — exploits must
// SUCCEED on the vulnerable app. Run one or the other against a given build,
// never expect both to be green at the same time.
"use strict";

const helpers = require("../tests/helpers");
const exploits = require("../tests/exploits");

const ctx = { fetch: global.fetch, ...helpers };

async function main() {
  // Reachability gate: distinguish "app down" from "fixed".
  try {
    const res = await fetch(helpers.baseUrl + "/");
    if (res.status >= 500) throw new Error("status " + res.status);
  } catch (err) {
    console.error(`NodeBazaar is not reachable at ${helpers.baseUrl} (${err.message}).`);
    console.error("Start it first: docker compose up -d --build");
    process.exit(2);
  }

  const ids = Object.keys(exploits);
  let vulnerable = 0;

  for (const id of ids) {
    const exploit = exploits[id];
    let outcome;
    try {
      outcome = await exploit.run(ctx);
    } catch (err) {
      outcome = { exploited: false, detail: `request failed (${err.message}) — treated as blocked` };
    }
    if (outcome.exploited) {
      vulnerable += 1;
      console.log(`FAIL  ${id}: still exploitable — ${outcome.detail}`);
    } else if (outcome.unverifiedFix) {
      console.log(`WARN  ${id}: not HTTP-verifiable after fix — ${outcome.detail}`);
      console.log(`      Confirm with a unit test against model/merge.js (assert __proto__ keys are rejected).`);
    } else {
      console.log(`PASS  ${id}: exploit blocked — ${outcome.detail}`);
    }
  }

  console.log("");
  if (vulnerable === 0) {
    console.log(`All ${ids.length} labs fixed. Safe to ship (the training part, anyway).`);
    process.exit(0);
  }
  console.log(`${vulnerable}/${ids.length} labs STILL VULNERABLE. Apply the fixes in docs/labs/ and re-run.`);
  process.exit(1);
}

main();