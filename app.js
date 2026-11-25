/* KIMZA portal core: Supabase client, login guard, navigation, small helpers. Arabic interface. */
(function () {
  var cfg = window.KIMZA_SUPABASE;
  var sb = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
  var DOMAIN = "@students.kimza.academy";
  var root = document.documentElement;

  // Theme (shared with the public site)
  try {
    var t = localStorage.getItem("kimza-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    root.setAttribute("data-theme", t);
  } catch (e) {}
  root.setAttribute("lang", "ar"); root.setAttribute("dir", "rtl");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(d, withTime) {
    if (!d) return "—";
    var x = new Date(d);
    var o = { year: "numeric", month: "2-digit", day: "2-digit" };
    if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
    return x.toLocaleString("en-GB", o);
  }
  function toast(msg, bad) {
    var el = document.createElement("div");
    el.className = "toast" + (bad ? " bad" : "");
    el.textContent = msg; el.setAttribute("role", "status");
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  }
  var ERR = {
    blocked: "لا يمكنك الحجز الآن: لديك إيقاف مؤقت عن الحجز لمدة أسبوع.",
    too_late: "لا يمكن الإلغاء قبل أقل من 24 ساعة من الموعد.",
    too_soon: "اختر موعداً بعد ساعتين على الأقل من الآن.",
    monthly_limit: "استخدمت حصتك الخاصة مع المعلم لهذا الشهر.",
    wrong_level: "هذه الجلسة لمستوى آخر.",
    unavailable: "هذه الجلسة غير متاحة الآن.",
    not_allowed: "ليس لديك صلاحية لهذا الإجراء.",
    bad_minutes: "اختر مدة 30 أو 45 أو 60 دقيقة."
  };
  function errMsg(e) {
    var m = (e && (e.message || e)) || "";
    for (var k in ERR) if (String(m).indexOf(k) >= 0) return ERR[k];
    return "حدث خطأ. حاول مرة أخرى.";
  }

  async function requireAuth(role) {
    var s = await sb.auth.getSession();
    var session = s.data.session;
    if (!session) { location.replace("login.html"); return null; }
    var p = await sb.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (!p.data) { await sb.auth.signOut(); location.replace("login.html"); return null; }
    var prof = p.data;
    if (role === "teacher" && prof.role !== "teacher") { location.replace("dashboard.html"); return null; }
    if (role === "student" && prof.role === "teacher") { location.replace("admin.html"); return null; }
    KZ.profile = prof; KZ.user = session.user;
    KZ.features = {};
    try {
      var fr = await sb.from("site_features").select("key,enabled");
      (fr.data || []).forEach(function (f) { KZ.features[f.key] = f.enabled; });
    } catch (e) {}
    if (prof.role === "student") {
      var page = (location.pathname.split("/").pop() || "").replace(".html", "");
      var PAGE_FEATURE = { review: "review", flashcards: "flashcards", attendance: "attendance", speaking: "speaking", certificates: "certificates", lesson: "lessons", test: "tests" };
      var key = !KZ.on("portal") ? "portal" : PAGE_FEATURE[page];
      if (key && !KZ.on(key)) {
        shell("");
        var ap = document.getElementById("app");
        if (ap) ap.innerHTML = '<div class="tile" style="text-align:center;padding:36px"><div style="font-size:2.4rem">🔒</div><h2>هذه الميزة متوقفة مؤقتاً</h2><p class="muted">سيعيد المعلم تشغيلها قريباً.</p>' + (key === "portal" ? "" : '<p><a class="btn btn-primary" href="dashboard.html">العودة للرئيسية</a></p>') + "</div>";
        return null;
      }
    }
    if (prof.role === "student") KZ.track();
    return prof;
  }

  function shell(active) {
    var prof = KZ.profile;
    var isT = prof && prof.role === "teacher";
    var FOFF = { "review.html": "review", "flashcards.html": "flashcards", "attendance.html": "attendance", "speaking.html": "speaking", "certificates.html": "certificates" };
    var links = isT
      ? [["admin.html", "لوحة المعلم", "admin"]]
      : [["dashboard.html", "الرئيسية", "home"], ["review.html", "المراجعة", "review"], ["flashcards.html", "البطاقات", "cards"], ["attendance.html", "الحضور", "att"], ["speaking.html", "المحادثة", "speak"], ["certificates.html", "الشهادات", "cert"]].filter(function (l) { return !FOFF[l[0]] || KZ.on(FOFF[l[0]]); });
    var h = '<div class="wrap"><a href="' + (isT ? "admin.html" : "dashboard.html") + '"><img src="kimza-logo-gold.png" alt="KIMZA Academy"></a>' +
      '<nav class="links" aria-label="Main">' + links.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<span class="who">' + esc(prof ? prof.full_name : "") + '</span><button class="btn btn-ghost sm" id="logoutBtn" type="button" style="color:var(--cream)">خروج</button></nav></div>';
    var el = document.getElementById("appHeader");
    if (el) el.innerHTML = h;
    var lb = document.getElementById("logoutBtn");
    if (lb) lb.addEventListener("click", async function () { await sb.auth.signOut(); location.href = "login.html"; });
    if (window.KZ_PORTAL) window.KZ_PORTAL.mount();
  }

  var KZ = { sb: sb, esc: esc, fmtDate: fmtDate, toast: toast, errMsg: errMsg, requireAuth: requireAuth, shell: shell, DOMAIN: DOMAIN, profile: null, user: null };
  window.KZ = KZ;
  KZ.features = {};
  // A feature is on unless the teacher switched it off.
  KZ.on = function (k) { return KZ.features[k] !== false; };

  // Copy protection helper for exam pages
  // Copy protection for a document (the page itself or a lesson/homework iframe)
  // How long the student really uses the portal: a heartbeat every 30 s while the page is visible and he is active
  KZ.track = function () {
    if (KZ._tracking) return; KZ._tracking = true;
    var lastAct = Date.now();
    ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
    setInterval(function () {
      if (document.visibilityState === "visible" && Date.now() - lastAct < 120000) { try { sb.rpc("track_time", { p_seconds: 30 }); } catch (e) {} }
    }, 30000);
  };
  // Any picture (jpg, png, webp, gif, heic on Safari) is resized and saved as a light JPEG, so uploads do not fail on size or type
  // delete storage objects one by one with a plain DELETE (the bulk call with a body fails in some browsers)
  KZ.removeObjects = async function (bucket, names) {
    var s = (await sb.auth.getSession()).data.session, err = null, n = 0;
    for (var i = 0; i < names.length; i++) {
      try {
        var res = await fetch(window.KIMZA_SUPABASE.url + "/storage/v1/object/" + bucket + "/" + names[i].split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: window.KIMZA_SUPABASE.publishableKey, Authorization: "Bearer " + s.access_token } });
        if (res.ok) n++; else err = "HTTP " + res.status;
      } catch (e) { err = e.message; }
    }
    return { count: n, error: n < names.length ? { message: err || "failed" } : null };
  };
  KZ.prepImage = function (file, maxSide) {
    maxSide = maxSide || 1800;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || "")) { reject(new Error("الملف ليس صورة.")); return; }
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, maxSide / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var ctx = c.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) resolve(b); else reject(new Error("تعذر تجهيز الصورة.")); }, "image/jpeg", 0.88);
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("هذه الصيغة غير مدعومة في متصفحك. حوّل الصورة إلى JPG أو PNG.")); };
      im.src = url;
    });
  };
  KZ.blockCopyIn = function (doc) {
    if (!doc || doc.__kzNoCopy) return; doc.__kzNoCopy = true;
    ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"].forEach(function (ev) { doc.addEventListener(ev, function (e) { var t = e.target; if (ev === "selectstart" && t && t.nodeType === 1 && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return; e.preventDefault(); }); });
    doc.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "u", "s", "p", "v"].indexOf(k) >= 0) e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    });
    if (doc.body) doc.body.classList.add("nocopy");
    try { var st = doc.createElement("style"); st.textContent = ".nocopy,.nocopy *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.nocopy input,.nocopy textarea{-webkit-user-select:text;user-select:text}@media print{body{display:none}}"; doc.head.appendChild(st); } catch (x) {}
  };
  KZ.blockCopy = function () { KZ.blockCopyIn(document); };
  // A confirmation box: returns a promise that resolves true (yes) or false (no).
  KZ.confirmBox = function (title, bodyHtml, yes, no) {
    return new Promise(function (resolve) {
      var m = document.createElement("div"); m.className = "kz-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true");
      m.innerHTML = '<div class="box"><h2>' + title + '</h2><div>' + bodyHtml + '</div><div class="btns"><button class="btn btn-ghost" data-n type="button">' + (no || "ليس بعد") + '</button><button class="btn btn-primary" data-y type="button">' + (yes || "نعم، ابدأ") + '</button></div></div>';
      document.body.appendChild(m);
      function done(v) { m.remove(); resolve(v); }
      m.querySelector("[data-y]").addEventListener("click", function () { done(true); });
      m.querySelector("[data-n]").addEventListener("click", function () { done(false); });
      m.querySelector("[data-y]").focus();
    });
  };
})();
