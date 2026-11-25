/* KIMZA Academy: theme, language and menu. Works with i18n.js (window.I18N). */
(function () {
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Theme: saved choice, otherwise the device setting
  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var b = document.getElementById("themeBtn");
    if (b) b.textContent = t === "dark" ? "☀" : "☾";
  }
  var theme = get("kimza-theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(theme);

  // Language: saved choice, default Arabic
  function applyLang(l) {
    var dict = (window.I18N && window.I18N[l]) || {};
    root.setAttribute("lang", l);
    root.setAttribute("dir", l === "ar" ? "rtl" : "ltr");
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n")];
      if (v !== undefined) el.innerHTML = v;
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      var v = dict[el.getAttribute("data-i18n-ph")];
      if (v !== undefined) el.setAttribute("placeholder", v);
    });
    var tk = document.body.getAttribute("data-title");
    if (tk && dict[tk]) document.title = dict[tk];
    var b = document.getElementById("langBtn");
    if (b) b.textContent = l === "ar" ? "English" : "العربية";
    window.dispatchEvent(new CustomEvent("kimza-lang", { detail: l }));
  }
  var lang = get("kimza-lang") || "ar";

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(theme);
    if (lang !== "ar") applyLang(lang); else applyLang("ar");
    var tb = document.getElementById("themeBtn");
    if (tb) tb.addEventListener("click", function () {
      theme = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      set("kimza-theme", theme); applyTheme(theme);
    });
    var lb = document.getElementById("langBtn");
    if (lb) lb.addEventListener("click", function () {
      lang = root.getAttribute("lang") === "ar" ? "en" : "ar";
      set("kimza-lang", lang); applyLang(lang);
    });
    var mb = document.getElementById("menuBtn"), nl = document.getElementById("navLinks");
    if (mb && nl) mb.addEventListener("click", function () {
      var open = nl.classList.toggle("open");
      mb.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });
  // Feature switches: the teacher can turn the placement test or the registration form off.
  window.KIMZA_FEATURES = {};
  (function () {
    var cfg = window.KIMZA_SUPABASE; if (!cfg || !window.fetch) return;
    var pages = { placement: "placement.html", register: "register.html" };
    window.KIMZA_FEATURES_READY = fetch(cfg.url + "/rest/v1/site_features?select=key,enabled", { headers: { apikey: cfg.publishableKey } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (rows) {
        rows.forEach(function (f) { window.KIMZA_FEATURES[f.key] = f.enabled; });
        var here = location.pathname.split("/").pop() || "index.html";
        function apply() {
          Object.keys(pages).forEach(function (k) {
            if (window.KIMZA_FEATURES[k] !== false) return;
            document.querySelectorAll('a[href="' + pages[k] + '"]').forEach(function (a) { a.style.display = "none"; });
            if (here === pages[k]) {
              var m = document.querySelector("main");
              if (m) m.innerHTML = '<section class="section"><div class="wrap" style="text-align:center;padding:80px 0"><h1>' + (window.KIMZA_LANG() === "ar" ? "هذه الصفحة متوقفة مؤقتاً" : "This page is temporarily unavailable") + '</h1><p><a class="btn btn-primary" href="index.html">' + (window.KIMZA_LANG() === "ar" ? "العودة للرئيسية" : "Back to home") + '</a></p></div></section>';
            }
          });
        }
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply); else apply();
      });
  })();
  window.KIMZA_LANG = function () { return root.getAttribute("lang") || "ar"; };
  window.KIMZA_T = function (k) { var d = (window.I18N || {})[window.KIMZA_LANG()] || {}; return d[k] !== undefined ? d[k] : k; };
})();
