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
      ? [["admin.html", "لوحة المعلم", "admin"], ["schedule.html", "مواعيد الحصص", "schedule"], ["account.html", "طلبات الأسماء", "account"], ["community.html", "المجتمع", "community"]]
      : [["dashboard.html", "الرئيسية", "home"], ["review.html", "المراجعة", "review"], ["flashcards.html", "البطاقات", "cards"], ["attendance.html", "الحضور", "att"], ["speaking.html", "المحادثة", "speak"], ["certificates.html", "الشهادات", "cert"], ["schedule.html", "مواعيد الحصص", "schedule"], ["account.html", "حسابي", "account"], ["community.html", "المجتمع", "community"]].filter(function (l) { return !FOFF[l[0]] || KZ.on(FOFF[l[0]]); });
    var h = '<div class="wrap"><a href="' + (isT ? "admin.html" : "dashboard.html") + '"><img src="kimza-logo-gold.png" alt="KIMZA Academy"></a>' +
      '<nav class="links" aria-label="Main">' + links.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<span class="who">' + esc(prof ? prof.full_name : "") + '</span><button class="btn btn-ghost sm" id="logoutBtn" type="button" style="color:var(--cream)">خروج</button></nav></div>';
    var el = document.getElementById("appHeader");
    if (el) el.innerHTML = h;
    try { KZ.mountBoardButton(); KZ.mountRecorderButton(); } catch (e) {}
    if (isT) { try { sb.from("name_requests").select("id", { count: "exact", head: true }).eq("status", "pending").then(function (r) { var n = r && r.count; var l = document.querySelector('#appHeader a[href="account.html"]'); if (n && l) l.insertAdjacentHTML("beforeend", ' <span style="background:#c62828;color:#fff;border-radius:20px;padding:0 8px;font-weight:800">' + n + "</span>"); }); } catch (e) {} }
    var lb = document.getElementById("logoutBtn");
    if (lb) lb.addEventListener("click", async function () { await sb.auth.signOut(); location.href = "login.html"; });
    if (window.KZ_PORTAL) window.KZ_PORTAL.mount();
  }

  var KZ = { sb: sb, esc: esc, fmtDate: fmtDate, toast: toast, errMsg: errMsg, requireAuth: requireAuth, shell: shell, DOMAIN: DOMAIN, profile: null, user: null };
  window.KZ = KZ;
  // ---- personal whiteboard (every signed-in user, every page) ----
  KZ.loadBoard = function () {
    if (window.KZBoard) return Promise.resolve();
    if (KZ._bp) return KZ._bp;
    KZ._bp = new Promise(function (res, rej) {
      var s0 = document.querySelector('script[src*="app.js"]'), src = s0 ? s0.getAttribute("src").replace("app.js", "board.js") : "board.js";
      var s = document.createElement("script"); s.src = src; s.onload = function () { res(); }; s.onerror = function () { KZ._bp = null; rej(new Error("board")); }; document.head.appendChild(s);
    });
    return KZ._bp;
  };
  KZ.openBoard = async function () {
    try { await KZ.loadBoard(); } catch (e) { toast("تعذر تحميل السبورة.", true); return; }
    var ov = document.getElementById("kzbOv");
    if (!ov) {
      var G = { x: 0, y: 0, w: 0, h: 0, max: false, min: false };
      try { G = Object.assign(G, JSON.parse(localStorage.getItem("kzb-win") || "{}")); } catch (e) {}
      var vw = window.innerWidth, vh = window.innerHeight;
      if (!G.w || G.w < 280) { G.w = Math.min(760, vw - 24); G.h = Math.min(520, vh - 80); G.x = Math.max(8, vw - G.w - 16); G.y = Math.max(8, vh - G.h - 72); }
      ov = document.createElement("div"); ov.id = "kzbOv";
      ov.style.cssText = "position:fixed;z-index:9998;background:#0B1F44;display:none;flex-direction:column;border:2px solid #D4AF37;border-radius:14px;box-shadow:0 14px 50px rgba(0,0,0,.55);overflow:hidden;direction:rtl";
      var bs = "font:inherit;border:1px solid #D4AF37;background:transparent;color:#F8F4E9;border-radius:9px;padding:4px 10px;cursor:pointer;min-height:32px";
      ov.innerHTML = '<div id="kzbHd" style="display:flex;align-items:center;gap:6px;padding:5px 10px;color:#F8F4E9;font-weight:700;cursor:move;touch-action:none;user-select:none;-webkit-user-select:none"><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🧑‍🏫 سبورتي ⠿ اسحب من هنا</span><button type="button" id="kzbMin" title="تصغير إلى شريط" style="' + bs + '">—</button><button type="button" id="kzbMax" title="تكبير / استرجاع الحجم" style="' + bs + '">▢</button><button type="button" id="kzbFs" title="ملء الشاشة بالكامل" style="' + bs + '">⛶</button><button type="button" id="kzbClose" title="إغلاق (تبقى محفوظة)" style="font:inherit;border:0;background:#D4AF37;color:#0B1F44;border-radius:9px;padding:4px 12px;cursor:pointer;font-weight:700;min-height:32px">✕</button></div><div id="kzbHost" style="flex:1;min-height:0;position:relative"></div>';
      document.body.appendChild(ov);
      var handles = [["n", "top:-3px;left:12px;right:12px;height:8px;cursor:ns-resize"], ["s", "bottom:-3px;left:12px;right:12px;height:8px;cursor:ns-resize"], ["w", "left:-3px;top:12px;bottom:12px;width:8px;cursor:ew-resize"], ["e", "right:-3px;top:12px;bottom:12px;width:8px;cursor:ew-resize"], ["nw", "top:-3px;left:-3px;width:16px;height:16px;cursor:nwse-resize"], ["ne", "top:-3px;right:-3px;width:16px;height:16px;cursor:nesw-resize"], ["sw", "bottom:-3px;left:-3px;width:18px;height:18px;cursor:nesw-resize"], ["se", "bottom:-3px;right:-3px;width:22px;height:22px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,#D4AF37 50%)"]];
      handles.forEach(function (h) { var d = document.createElement("div"); d.dataset.h = h[0]; d.style.cssText = "position:absolute;z-index:3;touch-action:none;" + h[1]; ov.appendChild(d); });
      function apply() {
        var vw2 = window.innerWidth, vh2 = window.innerHeight;
        if (G.max) { ov.style.left = "0"; ov.style.top = "0"; ov.style.width = vw2 + "px"; ov.style.height = vh2 + "px"; ov.style.borderRadius = "0"; ov.style.borderWidth = "0"; }
        else {
          G.w = Math.max(280, Math.min(G.w, vw2)); G.h = Math.max(200, Math.min(G.h, vh2)); G.x = Math.max(-G.w + 80, Math.min(G.x, vw2 - 80)); G.y = Math.max(0, Math.min(G.y, vh2 - 40));
          ov.style.left = G.x + "px"; ov.style.top = G.y + "px"; ov.style.width = G.w + "px"; ov.style.height = (G.min ? 44 : G.h) + "px"; ov.style.borderRadius = "14px"; ov.style.borderWidth = "2px";
        }
        document.getElementById("kzbHost").style.display = G.min && !G.max ? "none" : "block";
        try { localStorage.setItem("kzb-win", JSON.stringify(G)); } catch (e) {}
        if (KZ._boardInst) setTimeout(function () { KZ._boardInst.resize(); }, 30);
      }
      KZ._boardApply = apply;
      var drag = null;
      document.getElementById("kzbHd").addEventListener("pointerdown", function (e) { if (e.target.tagName === "BUTTON" || G.max) return; drag = { mode: "move", sx: e.clientX, sy: e.clientY, x: G.x, y: G.y }; e.currentTarget.setPointerCapture(e.pointerId); });
      ov.querySelectorAll("[data-h]").forEach(function (h) { h.addEventListener("pointerdown", function (e) { if (G.max) return; drag = { mode: h.dataset.h, sx: e.clientX, sy: e.clientY, x: G.x, y: G.y, w: G.w, h: G.h }; h.setPointerCapture(e.pointerId); e.preventDefault(); }); });
      function mv(e) {
        if (!drag) return; var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (drag.mode === "move") { G.x = drag.x + dx; G.y = drag.y + dy; }
        else {
          var m = drag.mode;
          if (m.indexOf("e") >= 0) G.w = Math.max(280, drag.w + dx);
          if (m.indexOf("s") >= 0) G.h = Math.max(200, drag.h + dy);
          if (m.indexOf("w") >= 0) { var nw = Math.max(280, drag.w - dx); G.x = drag.x + (drag.w - nw); G.w = nw; }
          if (m.indexOf("n") >= 0) { var nh = Math.max(200, drag.h - dy); G.y = drag.y + (drag.h - nh); G.h = nh; }
        }
        G.min = false; apply();
      }
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", function () { drag = null; });
      window.addEventListener("resize", function () { if (ov.style.display !== "none" && !document.fullscreenElement) apply(); });
      var sess = (await sb.auth.getSession()).data.session;
      KZ._boardInst = KZBoard.mount(document.getElementById("kzbHost"), { sb: sb, table: "user_boards", col: "user_id", val: sess.user.id });
      KZ._boardInst.setFull(true);
      document.getElementById("kzbClose").addEventListener("click", KZ.closeBoard);
      document.getElementById("kzbMin").addEventListener("click", function () { G.min = !G.min; G.max = false; apply(); });
      document.getElementById("kzbMax").addEventListener("click", function () { G.max = !G.max; G.min = false; apply(); });
      document.getElementById("kzbFs").addEventListener("click", function () { if (document.fullscreenElement) document.exitFullscreen(); else if (ov.requestFullscreen) ov.requestFullscreen().catch(function () {}); });
      document.addEventListener("fullscreenchange", function () {
        if (document.fullscreenElement === ov) { ov.style.left = "0"; ov.style.top = "0"; ov.style.width = "100vw"; ov.style.height = "100vh"; ov.style.borderRadius = "0"; ov.style.borderWidth = "0"; if (KZ._boardInst) setTimeout(function () { KZ._boardInst.resize(); }, 80); }
        else if (ov.style.display !== "none") apply();
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ov.style.display !== "none" && !document.fullscreenElement && !document.querySelector(".kzb-ed") && G.max) { G.max = false; apply(); } });
    }
    ov.style.display = "flex";
    var fab = document.getElementById("kzbFab"); if (fab) fab.style.display = "none";
    KZ._boardApply(); setTimeout(function () { if (KZ._boardInst) { KZ._boardInst.resize(); KZ._boardInst.setFull(true); } }, 60);
  };
  KZ.closeBoard = function () {
    var ov = document.getElementById("kzbOv"); if (!ov) return;
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    if (KZ._boardInst) KZ._boardInst.flush(); ov.style.display = "none";
    var fab = document.getElementById("kzbFab"); if (fab) fab.style.display = "";
  };
  // ---- temporary voice recorder (stays on the student's device; nothing is uploaded) ----
  KZ.mountRecorderButton = function () {
    if (document.getElementById("kzrFab")) return;
    var b = document.createElement("button"); b.id = "kzrFab"; b.type = "button"; b.title = "سجّل صوتك واسمعه";
    b.style.cssText = "position:fixed;bottom:16px;inset-inline-start:148px;z-index:900;font:inherit;font-weight:700;border:2px solid #D4AF37;background:#0B1F44;color:#F8F4E9;border-radius:30px;padding:10px 16px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;gap:6px;align-items:center";
    b.innerHTML = "🎙 <span>سجّل صوتك</span>";
    var panel = null, mr = null, chunks = [], stream = null, url = null, t0 = 0, tm = null, mime = "";
    function cleanup() { if (url) { URL.revokeObjectURL(url); url = null; } chunks = []; }
    function stopStream() { if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } if (tm) { clearInterval(tm); tm = null; } }
    function draw(state) {
      if (!panel) return;
      var h = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><strong style="flex:1">🎙 سجّل صوتك</strong><button type="button" id="kzrX" style="border:0;background:transparent;color:inherit;font-size:18px;cursor:pointer">✕</button></div>';
      if (state === "idle") h += '<p style="margin:0 0 8px;font-size:13px;opacity:.85">اقرأ الكلمات أو القصة بصوت عالٍ ثم اسمع نفسك. التسجيل <b>مؤقت على جهازك فقط</b> ولا يسمعه أحد، ولا المعلم.</p><button type="button" class="btn btn-primary" id="kzrGo">⏺ ابدأ التسجيل</button>';
      else if (state === "rec") h += '<p style="margin:0 0 8px">⏺ جارٍ التسجيل... <b id="kzrT">0:00</b></p><button type="button" class="btn btn-primary" id="kzrStop">⏹ إيقاف</button>';
      else if (state === "done") h += '<audio controls src="' + url + '" style="width:100%"></audio><div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button type="button" class="btn btn-primary sm" id="kzrSave">💾 حفظ على جهازي</button><button type="button" class="btn danger sm" id="kzrDel">🗑 حذف</button><button type="button" class="btn btn-ghost sm" id="kzrAgain">⏺ تسجيل جديد</button></div><p style="margin:8px 0 0;font-size:12px;opacity:.8">إن لم تحفظه سيُحذف عند إغلاق الصفحة.</p>';
      else h += '<p style="margin:0;color:#ffb4b4">' + state + "</p>";
      panel.innerHTML = h;
      var q = function (id) { return panel.querySelector(id); };
      if (q("#kzrX")) q("#kzrX").onclick = function () { if (mr && mr.state === "recording") { try { mr.stop(); } catch (e) {} } stopStream(); panel.style.display = "none"; };
      if (q("#kzrGo")) q("#kzrGo").onclick = start;
      if (q("#kzrStop")) q("#kzrStop").onclick = function () { try { mr.stop(); } catch (e) {} };
      if (q("#kzrSave")) q("#kzrSave").onclick = function () { var ext = /mp4/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : "webm", a2 = document.createElement("a"); a2.href = url; a2.download = "kimza-recording-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-") + "." + ext; document.body.appendChild(a2); a2.click(); a2.remove(); };
      if (q("#kzrDel")) q("#kzrDel").onclick = function () { cleanup(); draw("idle"); };
      if (q("#kzrAgain")) q("#kzrAgain").onclick = function () { cleanup(); start(); };
    }
    async function start() {
      try {
        cleanup(); stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        var opts = {}; ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"].some(function (m) { if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) { opts.mimeType = m; return true; } return false; });
        mr = new MediaRecorder(stream, opts); mime = mr.mimeType || opts.mimeType || "audio/webm";
        mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        mr.onstop = function () { stopStream(); if (chunks.length) { url = URL.createObjectURL(new Blob(chunks, { type: mime })); draw("done"); } else draw("idle"); };
        mr.start(); t0 = Date.now(); draw("rec");
        tm = setInterval(function () { var s = Math.floor((Date.now() - t0) / 1000), el = document.getElementById("kzrT"); if (el) el.textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }, 500);
      } catch (e) { stopStream(); draw("تعذر الوصول إلى الميكروفون. اسمح للمتصفح باستخدامه ثم أعد المحاولة."); }
    }
    b.addEventListener("click", function () {
      if (!panel) { panel = document.createElement("div"); panel.style.cssText = "position:fixed;bottom:70px;inset-inline-start:16px;z-index:901;width:min(320px,calc(100vw - 32px));background:#0B1F44;color:#F8F4E9;border:2px solid #D4AF37;border-radius:14px;padding:12px;box-shadow:0 10px 36px rgba(0,0,0,.5);display:none"; document.body.appendChild(panel); draw("idle"); }
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
    document.body.appendChild(b);
  };
  KZ.mountBoardButton = function () {
    if (document.getElementById("kzbFab")) return;
    var b = document.createElement("button"); b.id = "kzbFab"; b.type = "button"; b.title = "افتح سبورتي للكتابة والتدرب";
    b.style.cssText = "position:fixed;bottom:16px;inset-inline-start:16px;z-index:900;font:inherit;font-weight:700;border:2px solid #D4AF37;background:#0B1F44;color:#F8F4E9;border-radius:30px;padding:10px 16px;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;gap:6px;align-items:center";
    b.innerHTML = "🧑‍🏫 <span>السبورة</span>"; b.addEventListener("click", KZ.openBoard); document.body.appendChild(b);
  };
  KZ.features = {};
  // A feature is on unless the teacher switched it off.
  KZ.on = function (k) { return KZ.features[k] !== false; };
  // every level a student can study (own level + extra levels given by the teacher)
  KZ.levelsOf = function (p) {
    var a = [p.level]; (p.completed_levels || []).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); });
    return a.sort();
  };
  // lessons the teacher opened for this student only: all parts become open
  KZ.grants = async function () {
    var set = {};
    try { ((await KZ.sb.from("lesson_grants").select("lesson_id")).data || []).forEach(function (g) { set[g.lesson_id] = 1; }); } catch (e) {}
    return set;
  };
  KZ.applyGrant = function (l, set) {
    if (l && set && set[l.id]) { l.is_open = true; l.open_words = l.open_story = l.open_audio = l.open_exercises = l.open_homework = true; }
    return l;
  };

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
    // the teacher can copy and paste everywhere; students only inside the story text (.kz-copyok)
    if (KZ.profile && KZ.profile.role === "teacher") return;
    if (!doc || doc.__kzNoCopy) return; doc.__kzNoCopy = true;
    function ok(n) { try { while (n && n.nodeType !== 1) n = n.parentNode; return !!(n && n.closest && n.closest(".kz-copyok")); } catch (e) { return false; } }
    ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"].forEach(function (ev) { doc.addEventListener(ev, function (e) {
      var t = e.target;
      if (ev === "selectstart" && t && t.nodeType === 1 && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      if (ev === "cut" || ev === "paste") { e.preventDefault(); return; }
      if (ok(t)) return;
      if (ev === "copy") { try { var sel = doc.getSelection(); if (sel && sel.rangeCount && ok(sel.anchorNode) && ok(sel.focusNode)) return; } catch (x) {} }
      e.preventDefault(); }); });
    doc.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "a"].indexOf(k) >= 0) { try { var sel = doc.getSelection(), n = sel && sel.anchorNode; if (k === "c" && n && ok(n)) return; if (k === "a" && doc.activeElement && ok(doc.activeElement)) return; } catch (x) {} }
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "u", "s", "p", "v"].indexOf(k) >= 0) e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    });
    if (doc.body) doc.body.classList.add("nocopy");
    try { var st = doc.createElement("style"); st.textContent = ".nocopy,.nocopy *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.nocopy input,.nocopy textarea,.nocopy .kz-copyok,.nocopy .kz-copyok *{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}@media print{body{display:none}}"; doc.head.appendChild(st); } catch (x) {}
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


/* polish v3: header shadow on scroll + gentle scroll reveal */
(function () {
  var hd = document.querySelector(".nav,.app-nav");
  function sc() { if (hd) hd.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", sc, { passive: true }); sc();
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var targets = [];
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

/* pwa: "install app" button (Android/desktop prompt, iOS hint) */
(function () {
  var dp = null;
  function standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone; }
  function btn(txt, fn) {
    if (document.getElementById("kzInstall") || standalone()) return;
    try { if (localStorage.getItem("kz-inst-x")) return; } catch (e) {}
    var b = document.createElement("div"); b.id = "kzInstall";
    b.style.cssText = "position:fixed;bottom:16px;inset-inline-end:16px;z-index:902;display:flex;gap:6px;align-items:center;background:#D4AF37;color:#0B1F44;border-radius:30px;padding:8px 8px 8px 16px;font:700 14px Tajawal,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)";
    var a = document.createElement("button"); a.type = "button"; a.textContent = txt; a.style.cssText = "all:unset;cursor:pointer";
    var x = document.createElement("button"); x.type = "button"; x.textContent = "✕"; x.setAttribute("aria-label", "إخفاء"); x.style.cssText = "all:unset;cursor:pointer;padding:0 8px";
    a.onclick = function () { fn(b); }; x.onclick = function () { b.remove(); try { localStorage.setItem("kz-inst-x", "1"); } catch (e) {} };
    b.appendChild(a); b.appendChild(x); document.body.appendChild(b);
  }
  addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); dp = e; btn("📲 ثبّت التطبيق", function (b) { dp.prompt(); dp.userChoice.finally(function () { b.remove(); }); }); });
  addEventListener("load", function () {
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone() && document.body.classList.contains("app"))
      btn("📲 ثبّت التطبيق", function () { alert("في سفاري: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»."); });
  });
})();


/* compat: inset-inline shim for older browsers */
(function () {
  try { if (window.CSS && CSS.supports && CSS.supports("inset-inline-start", "0")) return; } catch (e) { return; }
  function fix(el) {
    if (!el || el.nodeType !== 1 || !el.style || !el.getAttribute) return;
    var st = el.getAttribute("style"); if (!st || st.indexOf("inset-inline") < 0) return;
    var rtl = document.documentElement.dir !== "ltr";
    st = st.replace(/inset-inline-start\s*:\s*([^;]+)/g, function (m, v) { return (rtl ? "right:" : "left:") + v; })
           .replace(/inset-inline-end\s*:\s*([^;]+)/g, function (m, v) { return (rtl ? "left:" : "right:") + v; });
    el.setAttribute("style", st);
  }
  function all(root) { fix(root); if (root.querySelectorAll) { var l = root.querySelectorAll("[style*='inset-inline']"); for (var i = 0; i < l.length; i++) fix(l[i]); } }
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) all(n); }); }); }).observe(document.documentElement, { childList: true, subtree: true });
})();
