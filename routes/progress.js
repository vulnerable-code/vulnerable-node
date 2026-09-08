// Lab progress dashboard — the one feature no other vulnerable app has:
// students see, in real time, which labs they have exploited.
//
// GET /labs       login-required page with a "Run checks" button (nothing
//                 runs automatically — several exploits mutate state).
// GET /labs/check runs the REAL exploits from tests/exploits.js (single source
//                 of truth) server-side, using the CALLER's own session
//                 cookie for requests the exploit does not log in for, and
//                 returns JSON. Mutating labs are restored afterwards:
//                   04-mass-assignment → POST /account role=customer&balance=5000
//                                        with the session the exploit created
//                   05-xss             → the review it inserted into product 2
//                                        is deleted via the db pool
//                   06-price-tamper    → the 1-cent order is left in place
//                                        (harmless history row)
//
// SAFETY: the checker only ever attacks the app as the logged-in student
// themselves — no privilege escalation, no cross-user data beyond what the
// labs already document.

const express = require("express");
const path = require("path");
const fs = require("fs");
const config = require("../config");
const db = require("../model/db");
const { requireLogin } = require("../middleware/auth");
const exploits = require("../tests/exploits");

// labId → markdown guide under docs/labs/ (allowlist: nothing else is served)
const DOC_FILES = {
  "01-idor": "01-bola-idor.md",
  "03-sqli-login": "03-sqli.md",
  "03b-sqli-union": "03-sqli.md",
  "03c-nosql-meta": "03b-nosql.md",
  "05-xss": "05-xss-token-theft.md",
  "04-mass-assignment": "04-mass-assignment.md",
  "06-price-tamper": "06-price-tamper-checkout.md",
  "07-jwt-forge": "07-jwt-weak-secret.md",
  "09-verbose-errors": "09-misconfig-debug.md",
  "10-log-injection": "10-logging-failures.md",
  "13-proto-pollution": "13-prototype-pollution.md",
  "15-path-traversal": "15-path-traversal.md",
  "16-command-injection": "16-command-injection.md",
};

const CHECK_TIMEOUT_MS = 8000;
const MAX_CONCURRENCY = 4;

const router = express.Router();

router.get("/labs", requireLogin, (req, res) => {
  const labs = Object.entries(exploits).map(([id, e]) => ({
    id,
    name: e.name,
    doc: DOC_FILES[id],
  }));
  res.render("labs", { title: "Lab progress", labs, total: labs.length });
});

// Serve the lab guide (allowlisted filenames only — never a path traversal).
router.get("/labs/docs/:file", requireLogin, (req, res) => {
  const file = req.params.file;
  if (!Object.values(DOC_FILES).includes(file)) {
    return res.status(404).render("error", { message: "Not found", error: {} });
  }
  const full = path.join(__dirname, "..", "docs", "labs", file);
  fs.readFile(full, "utf8", (err, md) => {
    if (err) return res.status(404).render("error", { message: "Not found", error: {} });
    res.type("text/plain; charset=utf-8").send(md);
  });
});

// --- Exploit runner -------------------------------------------------------

// Exploits talk HTTP to the app itself; honor APP_URL (tests) else self.
const baseUrl = process.env.APP_URL || `http://127.0.0.1:${config.port}`;

function cookieHeader(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

// ctx mirrors tests/helpers.js, except get/postForm/postJson default to the
// CALLER's session cookie so exploits exercise the app "as this student".
// login() records every session an exploit creates — that is what lets us
// restore state with the right user's credentials.
function makeCtx(callerCookie, captured) {
  async function login(username, password) {
    const res = await fetch(baseUrl + "/login/auth", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password, returnurl: "/" }),
      redirect: "manual",
    });
    const cookie = cookieHeader(res);
    await res.arrayBuffer();
    if (cookie) captured.push({ username, cookie });
    return cookie;
  }
  const get = async (p, cookie, token) => {
    const res = await fetch(baseUrl + p, {
      headers: {
        ...((cookie ?? callerCookie) ? { cookie: cookie ?? callerCookie } : {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      redirect: "manual",
    });
    return { res, text: await res.text() };
  };
  const postForm = async (p, body, cookie) => {
    const res = await fetch(baseUrl + p, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...((cookie ?? callerCookie) ? { cookie: cookie ?? callerCookie } : {}),
      },
      body: new URLSearchParams(body),
      redirect: "manual",
    });
    return { res, text: await res.text() };
  };
  const postJson = async (p, body, cookie, token) => {
    const res = await fetch(baseUrl + p, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...((cookie ?? callerCookie) ? { cookie: cookie ?? callerCookie } : {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(body),
    });
    return { res, text: await res.text() };
  };
  return { fetch: global.fetch, baseUrl, login, get, postForm, postJson };
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve({ exploited: false, detail: "timeout" }), ms)),
  ]);
}

// Restore state after a mutating lab ran. Uses the session the exploit itself
// created (captured via the login wrapper) — never the checker's identity.
async function restoreAfter(id, captured, pre) {
  try {
    if (id === "04-mass-assignment") {
      const s = captured.find((c) => c.username === "alice") || captured[0];
      if (s) {
        await makeCtx(s.cookie, [])
          .postForm("/account", { username: "alice", email: "alice@example.com", role: "customer", balance: "5000" }, s.cookie);
      }
    } else if (id === "05-xss" && pre.maxReviewId !== null) {
      const s = captured[0];
      // The exploit posts the review via its own login (alice); delete exactly
      // the review(s) created during the run for product 2.
      await db.pool.query(
        "DELETE FROM reviews WHERE id > $1 AND product_id = 2 AND user_id = (SELECT id FROM users WHERE username = $2)",
        [pre.maxReviewId, (s && s.username) || "alice"]
      );
    }
    // 06-price-tamper: order stays (harmless); 10-log-injection: message stays.
  } catch (err) {
    console.error("[labs] restore after", id, "failed:", err.message);
  }
}

async function runLab(id, exploit, callerCookie) {
  const pre = { maxReviewId: null };
  try {
    if (id === "05-xss") {
      const { rows } = await db.pool.query("SELECT COALESCE(MAX(id), 0)::int AS m FROM reviews");
      pre.maxReviewId = rows[0].m;
    }
    const captured = [];
    const ctx = makeCtx(callerCookie, captured);
    const out = await withTimeout(
      Promise.resolve(exploit.run(ctx)).catch((err) => ({ exploited: false, detail: "error: " + err.message })),
      CHECK_TIMEOUT_MS
    );
    await restoreAfter(id, captured, pre);
    return {
      id,
      name: exploit.name,
      exploited: !!out.exploited,
      detail: String(out.detail || ""),
    };
  } catch (err) {
    return { id, name: exploit.name, exploited: false, detail: "error: " + err.message };
  }
}

// Fixed-size worker pool so 13 exploits run 4 at a time, results in lab order.
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const idx = next++;
        results[idx] = await worker(items[idx]);
      }
    })
  );
  return results;
}

router.get("/labs/check", requireLogin, async (req, res, next) => {
  try {
    const callerCookie = req.headers.cookie || "";
    const entries = Object.entries(exploits);
    const results = await runPool(entries, MAX_CONCURRENCY, async ([id, exploit]) =>
      runLab(id, exploit, callerCookie)
    );
    const exploited = results.filter((r) => r.exploited).length;
    res.json({ results, summary: { exploited, total: results.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;