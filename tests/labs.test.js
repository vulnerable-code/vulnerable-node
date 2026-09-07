// NodeBazaar lab tests — documents that the documented exploits WORK against
// the current (intentionally vulnerable) code.
//
// Requires the stack to be running: docker compose up -d --build
// Run: node --test tests/          (env APP_URL to override the target)
//
// Each test asserts exploited === true for one lab. When you apply the fix
// described in docs/labs/<lab>.md, the corresponding test is EXPECTED to fail
// — that is the point. Verify the fixed build with:
//   npm run verify:fixes
// which runs the same exploits with inverted expectations (see README.md).
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");
const exploits = require("./exploits");

const ctx = { fetch: global.fetch, ...helpers };

for (const [id, exploit] of Object.entries(exploits)) {
  test(`${id}: ${exploit.name}`, async () => {
    const { exploited, detail } = await exploit.run(ctx);
    assert.equal(exploited, true, `expected exploit to succeed on the vulnerable app — ${detail}`);
  });
}