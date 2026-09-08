// Lab progress dashboard: calls /labs/check only when the student presses
// "Run checks" — never on page load, because several exploits mutate state.
"use strict";

(function () {
  var btn = document.getElementById("run-checks");
  var grid = document.getElementById("labs-grid");
  var fill = document.getElementById("progress-fill");
  var label = document.getElementById("progress-label");
  var progress = document.getElementById("progress");
  var errorBox = document.getElementById("labs-error");
  if (!btn || !grid) return;

  var TOTAL = grid.children.length;
  var originalLabel = btn.textContent;

  function setPill(card, state, text) {
    var pill = card.querySelector(".pill");
    pill.className = "pill pill-" + state;
    pill.textContent = text;
  }

  function render(results, summary) {
    var done = 0;
    results.forEach(function (r) {
      var card = document.getElementById("lab-" + r.id);
      if (!card) return;
      var detail = document.getElementById("lab-detail-" + r.id);
      if (detail) detail.textContent = r.detail || "";
      if (r.exploited) {
        setPill(card, "ok", "✅ EXPLOITED");
        done++;
      } else if (r.detail === "timeout") {
        setPill(card, "timeout", "⏱ TIMEOUT");
      } else {
        setPill(card, "pending", "❌ NOT YET");
      }
    });
    fill.style.width = (summary.exploited / (summary.total || 1)) * 100 + "%";
    label.textContent = summary.exploited + " / " + summary.total;
    if (progress) progress.setAttribute("aria-valuenow", String(summary.exploited));
  }

  function fail(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  btn.addEventListener("click", function () {
    btn.disabled = true;
    btn.textContent = "Running…";
    errorBox.hidden = true;
    fill.style.width = "0%";

    fetch("/labs/check", { headers: { accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        render(data.results || [], data.summary || { exploited: 0, total: TOTAL });
      })
      .catch(function (err) {
        fail("Could not run checks: " + err.message + ". Is the stack fully up?");
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = originalLabel;
      });
  });
})();