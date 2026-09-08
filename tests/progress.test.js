// Tests for the lab-progress dashboard (/labs, /labs/check).
// Requires the stack to be running: APP_PORT=8895 docker compose up -d --build
// Run: APP_URL=http://localhost:8895 node --test tests/progress.test.js
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const helpers = require("./helpers");

const baseUrl = helpers.baseUrl;

async function aliceCookie() {
  return helpers.login("alice", "alice123");
}

test("/labs requires login", async () => {
  const res = await fetch(baseUrl + "/labs", { redirect: "manual" });
  await res.arrayBuffer();
  assert.equal(res.status, 302);
  assert.ok(res.headers.get("location").startsWith("/login"), "redirects to /login");
});

test("/labs renders the dashboard for a logged-in user", async () => {
  const cookie = await aliceCookie();
  const res = await fetch(baseUrl + "/labs", { headers: { cookie }, redirect: "manual" });
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.ok(text.includes("Lab progress"), "page contains 'Lab progress'");
  assert.ok(text.includes("Run checks"), "page has the Run checks button");
});

test("/labs/check returns one result per lab with summary", async () => {
  const cookie = await aliceCookie();
  const res = await fetch(baseUrl + "/labs/check", { headers: { cookie } });
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.ok(Array.isArray(body.results));
  assert.equal(body.results.length, 13);
  assert.equal(body.summary.total, 13);
  assert.equal(typeof body.summary.exploited, "number");

  for (const r of body.results) {
    assert.equal(typeof r.id, "string", "id present");
    assert.equal(typeof r.name, "string", "name present");
    assert.equal(typeof r.exploited, "boolean", "exploited is boolean");
  }

  // The vulnerable app must yield at least these confirmed hits.
  const byId = Object.fromEntries(body.results.map((r) => [r.id, r]));
  for (const id of [
    "01-idor",
    "03-sqli-login",
    "03b-sqli-union",
    "03c-nosql-meta",
    "07-jwt-forge",
    "06-price-tamper",
    "15-path-traversal",
    "16-command-injection",
  ]) {
    assert.ok(byId[id], `result for ${id} present`);
    assert.equal(byId[id].exploited, true, `${id} exploited on the vulnerable app`);
  }
});

test("/labs state restoration: alice is customer with seed balance after checks", async () => {
  const cookie = await aliceCookie();
  // Run the mutating labs through the checker endpoint.
  await fetch(baseUrl + "/labs/check", { headers: { cookie } });
  const res = await fetch(baseUrl + "/account", { headers: { cookie } });
  const text = await res.text();
  assert.equal(res.status, 200);
  assert.match(text, /name="role" value="customer"/, "role restored to customer");
  assert.match(text, /name="balance" value="5000"/, "balance restored to seed value");
});