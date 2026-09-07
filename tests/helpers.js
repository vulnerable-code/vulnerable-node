// Shared helpers for the NodeBazaar lab tests.
// Plain fetch (Node 22 global) against a RUNNING app — no supertest, no app
// import: the suite documents exploits against the deployed stack, exactly as
// an attacker sees it.
"use strict";

const baseUrl = process.env.APP_URL || "http://localhost:8888";

function cookieHeader(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

// POST the login form and return the session as a fetch-ready Cookie header.
async function login(username, password) {
  const res = await fetch(baseUrl + "/login/auth", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password, returnurl: "/" }),
    redirect: "manual",
  });
  // Express-session sets connect.sid on the redirect response.
  const cookie = cookieHeader(res);
  // Drain the body so the socket is released.
  await res.arrayBuffer();
  if (!cookie) throw new Error(`login failed for ${username}: no Set-Cookie (status ${res.status})`);
  return cookie;
}

async function get(path, cookie, token) {
  const res = await fetch(baseUrl + path, {
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    redirect: "manual",
  });
  const text = await res.text();
  return { res, text };
}

async function postForm(path, body, cookie) {
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { cookie } : {}),
    },
    body: new URLSearchParams(body),
    redirect: "manual",
  });
  const text = await res.text();
  return { res, text };
}

async function postJson(path, body, cookie, token) {
  const res = await fetch(baseUrl + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { res, text };
}

module.exports = { baseUrl, login, get, postForm, postJson };