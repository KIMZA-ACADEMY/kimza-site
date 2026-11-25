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
  // Site designer: blocks (panels, ads, pictures, texts) and edited texts, both stored in the database
  (function () {
    var cfg = window.KIMZA_SUPABASE; if (!cfg || !window.fetch) return;
    function get(path) { return fetch(cfg.url + "/rest/v1/" + path, { headers: { apikey: cfg.publishableKey } }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); }
    function esc(x) { return String(x == null ? "" : x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    var PRESET = { navy: "#0B1F44", burgundy: "#7A0F2D", gold: "#D4AF37", cream: "#F8F4E9", white: "#FFFFFF" };
    function isDark(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return false; var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) < 140; }
    function ctaHref(b) {
      var t = b.cta_type, u = b.cta_url || "";
      if (!t || t === "none") return null;
      if (t === "placement") return "placement.html"; if (t === "contact") return "contact.html";
      if (t === "instagram") return (window.KIMZA_SITE && window.KIMZA_SITE.instagramUrl) || "https://www.instagram.com/kimza_academy/";
      if (t === "whatsapp") return "https://wa.me/" + u.replace(/\D/g, "");
      return u || null;
    }
    function renderBlock(b) {
      var st = b.style || {}, bg = st.bg === "custom" ? (st.bgc || "#0B1F44") : (PRESET[st.bg] || PRESET.navy);
      var dark = isDark(bg), rad = st.radius == null ? "14" : st.radius, size = st.size || "m", pos = b.image_url ? (st.imgPos || "side") : "none";
      var href = ctaHref(b), lab = b.cta_label || "المزيد";
      var ext = href && /^https?:/.test(href) ? ' target="_blank" rel="noopener"' : "";
      var btn = href ? '<a class="btn btn-primary" href="' + esc(href) + '"' + ext + ">" + esc(lab) + "</a>" : "";
      var el = document.createElement("section");
      el.className = "blk blk-" + b.kind + " blk-" + size + (st.width === "narrow" ? " blk-narrow" : "") + (dark ? " blk-dark" : " blk-light") + " blk-pos-" + pos + (st.align === "center" ? " blk-center" : "");
      el.style.setProperty("--blk-bg", bg); el.style.setProperty("--blk-r", rad + "px");
      if (pos === "bg") el.style.backgroundImage = "linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),url('" + b.image_url.replace(/'/g, "%27") + "')";
      var img = (b.image_url && pos !== "bg" && pos !== "none") ? '<img class="blk-img" src="' + esc(b.image_url) + '" alt="" loading="lazy">' : "";
      var txt = "";
      if (b.kind === "image") txt = b.title ? '<p class="blk-cap">' + esc(b.title) + "</p>" : "";
      else txt = (st.badge ? '<span class="adbadge">' + esc(st.badge) + "</span>" : "") + (b.title ? "<h2>" + esc(b.title) + "</h2>" : "") + (b.body ? "<p>" + esc(b.body).replace(/\n/g, "<br>") + "</p>" : "") + btn;
      el.innerHTML = '<div class="wrap blk-in">' + (pos === "top" || pos === "side" ? img : "") + (txt ? '<div class="blk-txt">' + txt + "</div>" : "") + "</div>";
      return el;
    }
    function layoutBlocks() {
      var root = document.getElementById("blocks"); if (!root) return;
      var page = root.getAttribute("data-page") || "home", pr = Promise.resolve(page);
      if (page === "custom") {
        var slug = new URLSearchParams(location.search).get("p") || "";
        pr = get("site_pages?slug=eq." + encodeURIComponent(slug) + "&select=*").then(function (ps) {
          if (!ps.length) { root.innerHTML = '<div class="wrap" style="padding:80px 0;text-align:center"><h1>' + (window.KIMZA_LANG() === "en" ? "Page not found" : "الصفحة غير موجودة") + "</h1></div>"; return null; }
          var t = document.getElementById("pgTitle"); if (t) t.textContent = ps[0].title; document.title = ps[0].title + " · KIMZA Academy"; return slug;
        });
      }
      pr.then(function (pg) {
        if (!pg) return;
        get("site_blocks?page=eq." + encodeURIComponent(pg) + "&select=*&order=sort.asc,id.asc").then(function (rows) {
          if (!rows.length) return;
          var keep = {}; rows.forEach(function (b) { if (b.kind === "builtin") keep[b.bkey] = 1; });
          root.querySelectorAll("[data-block]").forEach(function (el) { if (!keep[el.getAttribute("data-block")]) el.style.display = "none"; });
          rows.forEach(function (b) {
            var el = b.kind === "builtin" ? root.querySelector('[data-block="' + b.bkey + '"]') : renderBlock(b);
            if (el) root.appendChild(el);
          });
          var foot = root.querySelector("[data-after]"); if (foot) root.appendChild(foot);
        });
      });
    }
    function applyTexts() {
      var T = window.KIMZA_TEXTS; if (!T) return; var lang = window.KIMZA_LANG ? window.KIMZA_LANG() : "ar";
      document.querySelectorAll("[data-i18n]").forEach(function (el) { var o = T[el.getAttribute("data-i18n")]; if (o && o[lang]) el.innerHTML = o[lang]; });
    }
    function navPages() {
      get("site_pages?enabled=eq.true&in_nav=eq.true&select=slug,title&order=sort.asc,slug.asc").then(function (ps) {
        var nav = document.getElementById("navLinks"); if (!nav || !ps.length) return;
        var login = nav.querySelector('a[href="login.html"]');
        ps.forEach(function (p) { var a = document.createElement("a"); a.href = "page.html?p=" + p.slug; a.textContent = p.title; nav.insertBefore(a, login); });
      });
    }
    document.addEventListener("DOMContentLoaded", function () {
      layoutBlocks(); navPages();
      get("site_texts?select=*").then(function (rows) { var T = {}; rows.forEach(function (r) { T[r.key] = { ar: r.ar, en: r.en }; }); window.KIMZA_TEXTS = T; applyTexts(); });
      window.addEventListener("kimza-lang", applyTexts);
    });
  })();
  window.KIMZA_LANG = function () { return root.getAttribute("lang") || "ar"; };
  window.KIMZA_T = function (k) { var d = (window.I18N || {})[window.KIMZA_LANG()] || {}; return d[k] !== undefined ? d[k] : k; };
})();


/* polish v3: header shadow on scroll + gentle scroll reveal */
(function () {
  var hd = document.querySelector(".nav,.app-nav");
  function sc() { if (hd) hd.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", sc, { passive: true }); sc();
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var targets = document.querySelectorAll(".sec .wrap > *, .sec-head, footer .wrap > *");
  if (!targets.length) return;
  document.documentElement.classList.add("js-rv");
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
  var n = 0;
  Array.prototype.forEach.call(targets, function (t) {
    var r = t.getBoundingClientRect();
    t.classList.add("rv");
    t.style.setProperty("--rvd", (Math.min(n++ % 5, 4) * 70) + "ms");
    if (r.top < window.innerHeight * 0.92) requestAnimationFrame(function () { t.classList.add("in"); }); else io.observe(t);
  });
  setTimeout(function () { document.querySelectorAll(".rv:not(.in)").forEach(function (t) { var r = t.getBoundingClientRect(); if (r.top < window.innerHeight) t.classList.add("in"); }); }, 1800);
})();

/* big shortcut to the placement test on every public page */
(function () {
  var p = location.pathname.split("/").pop() || "index.html";
  if (/^(placement|register|login|reset|verify|page)/.test(p) || document.body.classList.contains("app")) return;
  function mk() {
    if (document.getElementById("ptShortcut")) return;
    var ar = (window.KIMZA_LANG ? window.KIMZA_LANG() : "ar") !== "en";
    var a = document.createElement("a"); a.id = "ptShortcut"; a.href = "placement.html";
    a.innerHTML = (ar ? "ابدأ اختبار المستوى المجاني" : "Take the free placement test") + "<small>" + (ar ? "5 دقائق فقط" : "only 5 minutes") + "</small>";
    a.style.cssText = "position:fixed;z-index:800;bottom:18px;inset-inline-start:50%;transform:translateX(50%);display:flex;flex-direction:column;align-items:center;gap:2px;padding:12px 26px;border-radius:40px;background:#7a1530;color:#fff;border:2px solid #D4AF37;font:700 17px Tajawal,sans-serif;text-decoration:none;box-shadow:0 10px 30px rgba(0,0,0,.45);white-space:nowrap";
    if (document.documentElement.dir === "ltr") a.style.transform = "translateX(-50%)";
    a.querySelector("small").style.cssText = "font-size:12px;font-weight:500;color:#F8F4E9";
    document.body.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mk); else mk();
})();
