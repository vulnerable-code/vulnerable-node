// CLEAN SEED — scanners should report NOTHING here.
// Same shape as xss-raw-echo.js but output-escaped and input-validated.
const express = require("express");
const app = express();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

app.get("/greet", (req, res) => {
  res.send("<h1>Hello " + escapeHtml(req.query.name || "guest") + "</h1>");
});

app.get("/redirect", (req, res) => {
  const next = req.query.returnurl || "/";
  // relative same-origin paths only
  if (!next.startsWith("/") || next.startsWith("//")) {
    return res.redirect("/");
  }
  res.redirect(next);
});

app.listen(3000);