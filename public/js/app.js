// Front-end glue. VULN (A05/A07): the API token is kept in localStorage, so
// any stored XSS on the shop pages can exfiltrate it.
// SAFE: do not persist bearer tokens where scripts can read them; keep the
// session cookie HttpOnly and let the server render what the page needs.

(function () {
  var token = localStorage.getItem("nodebazaar_token");
  if (!token) {
    var el = document.getElementById("api-token");
    if (el) {
      token = el.textContent.trim();
      try { localStorage.setItem("nodebazaar_token", token); } catch (e) {}
    }
  }
  var preview = document.getElementById("api-me");
  if (preview && token) {
    fetch("/api/v1/me", { headers: { Authorization: "Bearer " + token } })
      .then(function (r) { return r.json(); })
      .then(function (u) {
        preview.textContent = u.username ? (u.username + " (" + u.role + ")") : "token rejected";
      })
      .catch(function () { preview.textContent = "token rejected"; });
  }
})();