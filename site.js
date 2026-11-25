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
    var pages = { placement: "placement.html", register: "register.html", about: "about.html", courses: "courses.html" };
    window.KIMZA_FEATURES_READY = fetch(cfg.url + "/rest/v1/site_features?select=key,enabled", { headers: { apikey: cfg.publishableKey } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (rows) {
        rows.forEach(function (f) { window.KIMZA_FEATURES[f.key] = f.enabled; });
        var here = location.pathname.split("/").pop() || "index.html";
        function apply() {
          document.querySelectorAll("[data-show]").forEach(function (el) { if (window.KIMZA_FEATURES[el.getAttribute("data-show")] === true) el.style.display = "block"; });
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
  // Courses and advertisements typed by the teacher (stored in the database)
  (function () {
    var cfg = window.KIMZA_SUPABASE; if (!cfg || !window.fetch) return;
    function get(path) { return fetch(cfg.url + "/rest/v1/" + path, { headers: { apikey: cfg.publishableKey } }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); }
    function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function cta(o) {
      var t = o.cta_type, u = o.cta_url || "", href = "placement.html", lab = o.cta_label;
      if (t === "contact") { href = "contact.html"; }
      else if (t === "instagram") { href = (window.KIMZA_SITE && window.KIMZA_SITE.instagramUrl) || "https://www.instagram.com/kimza_academy/"; }
      else if (t === "whatsapp") { href = "https://wa.me/" + u.replace(/\D/g, ""); }
      else if (t === "link") { href = u || "#"; }
      if (!lab) lab = t === "placement" ? "ابدأ باختبار تحديد المستوى" : t === "whatsapp" ? "تواصل عبر واتساب" : t === "instagram" ? "تواصل عبر إنستغرام" : t === "contact" ? "تواصل معنا" : "المزيد";
      var ext = /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
      return '<a class="btn btn-primary" href="' + esc(href) + '"' + ext + ">" + esc(lab) + "</a>";
    }
    function line(k, v) { return v ? '<div class="crow"><span>' + k + "</span><strong>" + esc(v) + "</strong></div>" : ""; }
    document.addEventListener("DOMContentLoaded", function () {
      var bar = document.getElementById("adsBar");
      if (bar) get("ads?select=*&is_active=eq.true&order=sort.asc,id.desc").then(function (ads) {
        bar.innerHTML = ads.map(function (a) { return '<div class="adcard">' + (a.badge ? '<span class="adbadge">' + esc(a.badge) + "</span>" : "") + "<div><h3>" + esc(a.title) + "</h3>" + (a.body ? "<p>" + esc(a.body) + "</p>" : "") + "</div>" + cta(a) + "</div>"; }).join("");
      });
      var list = document.getElementById("coursesList");
      if (list) get("courses?select=*&is_published=eq.true&order=sort.asc,id.asc").then(function (cs) {
        var en = window.KIMZA_LANG() === "en";
        if (!cs.length) { list.innerHTML = '<p class="muted">' + (en ? "New courses will be announced soon." : "سنعلن عن الدورات الجديدة قريباً.") + "</p>"; return; }
        list.innerHTML = cs.map(function (c) {
          return '<article class="ccard"><div class="chead"><h2>' + esc(c.title) + "</h2>" + (c.level ? '<span class="adbadge en">' + esc(c.level) + "</span>" : "") + "</div>" +
            (c.summary ? '<p class="clead">' + esc(c.summary) + "</p>" : "") +
            (c.price ? '<div class="cprice"><strong>' + esc(c.price) + "</strong>" + (c.price_note ? "<span>" + esc(c.price_note) + "</span>" : "") + "</div>" : "") +
            (c.description ? '<p class="cdesc">' + esc(c.description).replace(/\n/g, "<br>") + "</p>" : "") +
            (c.goals ? '<div class="cgoals"><h4>' + (en ? "Goals" : "أهداف الدورة") + "</h4><p>" + esc(c.goals).replace(/\n/g, "<br>") + "</p></div>" : "") +
            '<div class="cmeta">' + line(en ? "Who it is for" : "لمن؟", c.audience) + line(en ? "Duration" : "المدة", c.duration) + line(en ? "Schedule" : "المواعيد", c.schedule) + "</div>" +
            '<div class="btns">' + cta(c) + "</div></article>";
        }).join("");
      });
    });
  })();
  window.KIMZA_LANG = function () { return root.getAttribute("lang") || "ar"; };
  window.KIMZA_T = function (k) { var d = (window.I18N || {})[window.KIMZA_LANG()] || {}; return d[k] !== undefined ? d[k] : k; };
})();
