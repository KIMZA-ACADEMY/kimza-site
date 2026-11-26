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
    var pgName = (location.pathname.split("/").pop() || "").replace(".html", "");
    if (prof.role === "staff") {
      // assistant teacher: only the teacher panel, only while active
      var spr = await sb.from("staff_perms").select("*").eq("user_id", session.user.id).maybeSingle();
      KZ.staff = spr.data || { perms: [], levels: [], suspended: true };
      if (KZ.staff.suspended) { await sb.auth.signOut(); alert("تم إيقاف حسابك مؤقتاً من إدارة الأكاديمية. تواصل مع المدير."); location.replace("login.html"); return null; }
      if (pgName !== "admin" && pgName !== "login") { location.replace("admin.html"); return null; }
    } else if (role === "teacher" && prof.role !== "teacher") { location.replace("dashboard.html"); return null; }
    if (role === "student" && prof.role === "teacher") { location.replace("admin.html"); return null; }
    if (role === "student" && prof.role === "staff") { location.replace("admin.html"); return null; }
    KZ.profile = prof; KZ.user = session.user;
    try { KZ.loadTheme(); } catch (e) {}
    KZ.features = {};
    try {
      var fr = await sb.from("site_features").select("key,enabled");
      (fr.data || []).forEach(function (f) { KZ.features[f.key] = f.enabled; });
      if (prof.role === "student") { var fo = await sb.from("feature_overrides").select("key,enabled").eq("user_id", session.user.id); (fo.data || []).forEach(function (f) { KZ.features[f.key] = f.enabled; }); }
    } catch (e) {}
    if (prof.role === "student") {
      var page = (location.pathname.split("/").pop() || "").replace(".html", "");
      var PAGE_FEATURE = { review: "review", flashcards: "flashcards", attendance: "attendance", speaking: "speaking", certificates: "certificates", lesson: "lessons", test: "tests", friends: "friends", tasks: "p_tasks", messages: "p_messages", skills: "p_skills", exams: "p_exams", schedule: "p_schedule", account: "p_account", community: "p_community" };
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
    var isT = prof && (prof.role === "teacher" || prof.role === "staff");
    var FOFF = { "review.html": "review", "flashcards.html": "flashcards", "attendance.html": "attendance", "speaking.html": "speaking", "certificates.html": "certificates", "tasks.html": "p_tasks", "messages.html": "p_messages", "skills.html": "p_skills", "exams.html": "p_exams", "friends.html": "friends", "schedule.html": "p_schedule", "account.html": "p_account", "community.html": "p_community" };
    var links = prof && prof.role === "staff" ? [["admin.html", "لوحة المعلم", "admin"]] : isT
      ? [["admin.html", "لوحة المعلم", "admin"], ["schedule.html", "مواعيد الحصص", "schedule"], ["account.html", "طلبات الأسماء", "account"], ["community.html", "المجتمع", "community"]]
      : [["dashboard.html", "الرئيسية", "home"], ["review.html", "المراجعة", "review"], ["flashcards.html", "البطاقات", "cards"], ["attendance.html", "الحضور", "att"], ["tasks.html", "مهامي", "tasks"], ["messages.html", "رسائلي", "messages"], ["skills.html", "الكتابة والمحادثة", "skills"], ["exams.html", "الامتحانات", "exams"], ["friends.html", "أصدقائي", "friends"], ["speaking.html", "المحادثة", "speak"], ["certificates.html", "الشهادات", "cert"], ["schedule.html", "مواعيد الحصص", "schedule"], ["account.html", "حسابي", "account"], ["community.html", "المجتمع", "community"]].filter(function (l) { return !FOFF[l[0]] || KZ.on(FOFF[l[0]]); });
    var h = '<div class="wrap"><a href="' + (isT ? "admin.html" : "dashboard.html") + '"><img src="kimza-logo-gold.png" alt="KIMZA Academy"></a>' + '' +
      '<nav class="links" aria-label="Main">' + links.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<button class="btn btn-ghost sm" id="lookBtn" type="button" title="مظهري" aria-label="مظهري" style="color:var(--cream)">🎨</button>' + '<span class="who">' + esc(prof ? prof.full_name : "") + '</span><button class="btn btn-ghost sm" id="logoutBtn" type="button" style="color:var(--cream)">خروج</button></nav></div>';
    var el = document.getElementById("appHeader");
    if (el) el.innerHTML = h;
    try { KZ.mountBoardButton(); KZ.mountRecorderButton(); KZ.mountBellButton(); } catch (e) {}
    try { KZ.startSelectSearch(); } catch (e) {}
    if (isT) { try { sb.from("name_requests").select("id", { count: "exact", head: true }).eq("status", "pending").then(function (r) { var n = r && r.count; var l = document.querySelector('#appHeader a[href="account.html"]'); if (n && l) l.insertAdjacentHTML("beforeend", ' <span style="background:#c62828;color:#fff;border-radius:20px;padding:0 8px;font-weight:800">' + n + "</span>"); }); } catch (e) {} }
    try { KZ.notifyStart(); } catch (e) {}
    var lkb = document.getElementById("lookBtn"); if (lkb) lkb.addEventListener("click", function () { KZ.openLook(); });
    try { KZ.initReveal(); } catch (e) {}
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
  KZ.dragFab = function (b, key, defX, defY) {
    var pos = null; try { pos = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
    function place(x, y) {
      var w = b.offsetWidth || 44, h = b.offsetHeight || 44;
      x = Math.max(4, Math.min(innerWidth - w - 4, x)); y = Math.max(4, Math.min(innerHeight - h - 4, y));
      b.style.left = x + "px"; b.style.top = y + "px"; b.style.right = "auto"; b.style.bottom = "auto"; 
    }
    place(pos && isFinite(pos.x) ? pos.x : defX, pos && isFinite(pos.y) ? pos.y : defY());
    var sx = 0, sy = 0, ox = 0, oy = 0, moved = false, down = false;
    b.style.touchAction = "none";
    b.addEventListener("pointerdown", function (e) { down = true; moved = false; sx = e.clientX; sy = e.clientY; ox = b.offsetLeft; oy = b.offsetTop; try { b.setPointerCapture(e.pointerId); } catch (x) {} });
    b.addEventListener("pointermove", function (e) { if (!down) return; var dx = e.clientX - sx, dy = e.clientY - sy; if (!moved && Math.hypot(dx, dy) < 6) return; moved = true; place(ox + dx, oy + dy); });
    b.addEventListener("pointerup", function () { down = false; if (moved) { try { localStorage.setItem(key, JSON.stringify({ x: b.offsetLeft, y: b.offsetTop })); } catch (x) {} } });
    b.addEventListener("click", function (e) { if (moved) { e.stopImmediatePropagation(); e.preventDefault(); moved = false; } }, true);
    addEventListener("resize", function () { place(b.offsetLeft, b.offsetTop); });
  };
  KZ.mountRecorderButton = function () {
    if (document.getElementById("kzrFab")) return;
    var b = document.createElement("button"); b.id = "kzrFab"; b.type = "button"; b.title = "سجّل صوتك واسمعه";
    b.style.cssText = "position:fixed;z-index:900;width:44px;height:44px;font-size:20px;line-height:1;border:2px solid #D4AF37;background:#0B1F44;color:#F8F4E9;border-radius:50%;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;opacity:.92";
    b.setAttribute("aria-label", "سجّل صوتك (اسحب الزر لتحريكه)"); b.title = "سجّل صوتك (اسحب الزر لتحريكه)";
    b.textContent = "🎙";
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
      if (panel.style.display === "block") {
        var r = b.getBoundingClientRect(), pw = panel.offsetWidth || 300, ph = panel.offsetHeight || 160;
        var px = Math.max(8, Math.min(innerWidth - pw - 8, r.left)), py = r.top > innerHeight / 2 ? r.top - ph - 8 : r.bottom + 8;
        panel.style.left = px + "px"; panel.style.top = Math.max(8, Math.min(innerHeight - ph - 8, py)) + "px"; panel.style.bottom = "auto"; panel.style.right = "auto";
      }
    });
    document.body.appendChild(b);
    KZ.dragFab(b, "kz-fab-rec", 8, function () { return Math.round(innerHeight * 0.42) + 52; });
  };
  KZ.mountBoardButton = function () {
    if (document.getElementById("kzbFab")) return;
    var b = document.createElement("button"); b.id = "kzbFab"; b.type = "button"; b.title = "افتح سبورتي للكتابة والتدرب";
    b.style.cssText = "position:fixed;z-index:900;width:44px;height:44px;font-size:20px;line-height:1;border:2px solid #D4AF37;background:#0B1F44;color:#F8F4E9;border-radius:50%;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;opacity:.92";
    b.setAttribute("aria-label", "السبورة (اسحب الزر لتحريكه)"); b.title = "السبورة (اسحب الزر لتحريكه)";
    b.textContent = "🧑‍🏫"; b.addEventListener("click", KZ.openBoard); document.body.appendChild(b);
    KZ.dragFab(b, "kz-fab-board", 8, function () { return Math.round(innerHeight * 0.42); });
  };
  // ----- WhatsApp-style reply: swipe a message (either direction) or tap the arrow to reply to it -----
  KZ.quote = function (m) {
    if (!m) return "";
    var t = String(m.body || "").replace(/\s+/g, " "); if (t.length > 90) t = t.slice(0, 90) + "…";
    return '<div style="border-inline-start:4px solid #D4AF37;background:rgba(0,0,0,.06);border-radius:8px;padding:4px 8px;margin:4px 0;font-size:.85rem;opacity:.9">↩ ' + KZ.esc(t) + "</div>";
  };
  KZ.replyBtn = function (id) { return ' <button type="button" data-rpl="' + id + '" title="رد على هذه الرسالة" aria-label="رد" style="border:0;background:none;cursor:pointer;font-size:1rem;padding:0 4px;opacity:.7">↩</button>'; };
  // box = the scroll container (stays in the page), input = the textarea, byId(id) -> message row
  KZ.chatReply = function (box, input, byId) {
    var st = { id: null }, bar = null;
    function show(id) {
      var m = byId(id); if (!m) return; st.id = id;
      if (!bar) { bar = document.createElement("div"); bar.style.cssText = "display:flex;align-items:center;gap:8px;border-inline-start:4px solid #D4AF37;background:rgba(212,175,55,.14);border-radius:8px;padding:6px 10px;margin-bottom:6px;font-size:.9rem"; input.parentNode.insertBefore(bar, input.previousElementSibling && input.previousElementSibling.tagName === "LABEL" ? input.previousElementSibling : input); }
      var t = String(m.body || "").replace(/\s+/g, " "); if (t.length > 80) t = t.slice(0, 80) + "…";
      bar.innerHTML = '<span style="flex:1">↩ ردّاً على: ' + KZ.esc(t) + '</span><button type="button" style="border:0;background:none;cursor:pointer;font-size:1.1rem" aria-label="إلغاء الرد">✕</button>';
      bar.querySelector("button").onclick = clear; bar.style.display = "flex"; input.focus();
    }
    function clear() { st.id = null; if (bar) bar.style.display = "none"; }
    box.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-rpl]"); if (b) show(Number(b.getAttribute("data-rpl"))); });
    var el = null, sx = 0, sy = 0, dx = 0, lock = false, active = false;
    box.addEventListener("pointerdown", function (e) { el = e.target.closest && e.target.closest("[data-mid]"); if (!el || (e.target.closest && e.target.closest("button,a"))) { el = null; return; } sx = e.clientX; sy = e.clientY; dx = 0; lock = false; active = true; });
    box.addEventListener("pointermove", function (e) {
      if (!active || !el) return; var mx = e.clientX - sx, my = e.clientY - sy;
      if (!lock) { if (Math.abs(my) > 12 && Math.abs(my) > Math.abs(mx)) { active = false; return; } if (Math.abs(mx) > 8) lock = true; else return; }
      dx = Math.max(-90, Math.min(90, mx)); el.style.transition = "none"; el.style.transform = "translateX(" + dx + "px)";
    });
    function end() { if (!el) return; var id = Number(el.getAttribute("data-mid")), hit = Math.abs(dx) > 55; el.style.transition = "transform .18s"; el.style.transform = ""; el = null; active = false; if (hit) show(id); dx = 0; }
    box.addEventListener("pointerup", end); box.addEventListener("pointercancel", end); box.addEventListener("pointerleave", end);
    return { get: function () { return st.id; }, clear: clear };
  };
  // ----- search box above every long list (students, lessons ...): type a few letters to filter -----
  function nrm(t) { return String(t || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); }); }
  KZ.enhanceSelects = function (root) {
    (root || document).querySelectorAll("select").forEach(function (sel) {
      if (!(KZ.profile && (KZ.profile.role === "teacher" || KZ.profile.role === "staff"))) return;
      if (sel.dataset.kzs || sel.dataset.nosearch || sel.options.length < 8) return;
      sel.dataset.kzs = "1";
      var inp = document.createElement("input"); inp.type = "search"; inp.placeholder = "🔎 ابحث بالاسم أو الرقم…"; inp.setAttribute("aria-label", "بحث في القائمة");
      inp.style.cssText = "display:block;width:100%;margin-bottom:4px;box-sizing:border-box";
      sel.parentNode.insertBefore(inp, sel);
      var snap = null;
      function opts() { return Array.prototype.map.call(sel.options, function (o) { return { v: o.value, t: o.textContent, sel: o.selected, d: o.disabled }; }); }
      function fill(list, keep) {
        var chosen = {}; Array.prototype.forEach.call(sel.selectedOptions || [], function (o) { chosen[o.value] = 1; });
        sel.innerHTML = ""; list.forEach(function (o) { var e = document.createElement("option"); e.value = o.v; e.textContent = o.t; e.disabled = o.d; if (chosen[o.v] || (keep && o.sel && !Object.keys(chosen).length)) e.selected = true; sel.appendChild(e); });
      }
      inp.addEventListener("input", function () {
        var q = nrm(inp.value.trim());
        if (!snap) snap = opts();
        var sv = sel.value;
        if (!q) { var all = snap; snap = null; fill(all, false); if (sv) sel.value = sv; return; }
        var words = q.split(/\s+/);
        var m = snap.filter(function (o) { var t = nrm(o.t); return o.v === sv || words.every(function (w) { return t.indexOf(w) >= 0; }); });
        fill(m, false); if (sv) sel.value = sv;
      });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var f = Array.prototype.filter.call(sel.options, function (o) { return o.value !== ""; })[0]; if (f && !sel.multiple) { sel.value = f.value; sel.dispatchEvent(new Event("change", { bubbles: true })); } } });
    });
  };
  // ----- teacher panel: a search box above every long list of rows/cards/table rows -----
  KZ.enhanceLists = function (root) {
    if (!(KZ.profile && (KZ.profile.role === "teacher" || KZ.profile.role === "staff"))) return;
    var scope = root.querySelector ? root.querySelector("#view") : null; if (!scope || scope.querySelector("#stQ")) return;
    var cands = [];
    scope.querySelectorAll("*").forEach(function (el) {
      if (el.dataset.kzl || el.tagName === "SELECT" || el.tagName === "NAV" || el.tagName === "THEAD" || el.closest("[data-kzl-skip]")) return;
      var kids = Array.prototype.filter.call(el.children, function (c) { return c.nodeType === 1; });
      if (kids.length < 8) return;
      var sig = kids[0].tagName + "." + (kids[0].className || "").toString().split(" ")[0];
      var same = kids.filter(function (c) { return c.tagName + "." + (c.className || "").toString().split(" ")[0] === sig; });
      if (same.length < 8 || same.length < kids.length * 0.8) return;
      var avg = same.reduce(function (s, c) { return s + (c.textContent || "").trim().length; }, 0) / same.length;
      if (avg < 12) return;                                   // buttons / chips / tabs
      if (same[0].tagName === "OPTION" || same[0].tagName === "LI" && el.closest(".agroups,.tabs")) return;
      cands.push({ el: el, items: same });
    });
    cands.forEach(function (c) {
      // skip containers nested in another candidate (keep the outermost)
      if (cands.some(function (o) { return o.el !== c.el && o.el.contains(c.el); })) return;
      if (c.el.dataset.kzl) return; c.el.dataset.kzl = "1";
      var host = c.el.tagName === "TBODY" ? c.el.closest("table") : c.el;
      var inp = document.createElement("input"); inp.type = "search"; inp.placeholder = "🔎 ابحث في هذه القائمة بالاسم أو أي كلمة…"; inp.setAttribute("aria-label", "بحث في القائمة");
      inp.style.cssText = "display:block;width:100%;box-sizing:border-box;margin:6px 0 10px"; inp.dataset.kzl = "1";
      host.parentNode.insertBefore(inp, host);
      var cnt = document.createElement("div"); cnt.className = "muted"; cnt.style.cssText = "margin:-4px 0 8px;font-size:.85rem"; inp.after(cnt);
      inp.addEventListener("input", function () {
        var q = nrm(inp.value.trim()), words = q ? q.split(/\s+/) : [], shown = 0;
        c.items.forEach(function (it) { var ok = !words.length || words.every(function (w) { return nrm(it.textContent).indexOf(w) >= 0; }); it.style.display = ok ? "" : "none"; if (ok) shown++; });
        cnt.textContent = words.length ? shown + " من " + c.items.length : "";
      });
    });
  };
  KZ.startSelectSearch = function () {
    if (KZ._selObs) return; KZ._selObs = true; var t = null;
    function run() { try { KZ.enhanceSelects(document); } catch (e) {} try { KZ.enhanceLists(document); } catch (e) {} }
    new MutationObserver(function () { clearTimeout(t); t = setTimeout(run, 120); }).observe(document.body, { childList: true, subtree: true });
    run();
  };
  // ----- notification centre: a draggable bell on every portal page (works without any device permission) -----
  KZ.mountBellButton = function () {
    if (document.getElementById("kzBell")) return;
    var b = document.createElement("button"); b.id = "kzBell"; b.type = "button";
    b.style.cssText = "position:fixed;z-index:901;width:44px;height:44px;font-size:20px;line-height:1;border:2px solid #D4AF37;background:#0B1F44;color:#F8F4E9;border-radius:50%;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;opacity:.95";
    b.setAttribute("aria-label", "الإشعارات (اسحب الزر لتحريكه)"); b.title = "الإشعارات (اسحب الزر لتحريكه)";
    b.innerHTML = '🔔<span id="kzBellN" style="position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;border-radius:10px;background:#c62828;color:#fff;font:700 12px/20px sans-serif;text-align:center;padding:0 5px;display:none"></span>';
    document.body.appendChild(b);
    KZ.dragFab(b, "kz-fab-bell", 8, function () { return Math.round(innerHeight * 0.42) - 52; });
    var sb = KZ.sb, uid = KZ.user ? KZ.user.id : "", isT = KZ.profile && (KZ.profile.role === "teacher" || KZ.profile.role === "staff"), items = [], panel = null;
    var seenKey = "kz-ann-seen-" + uid;
    function seen() { try { return localStorage.getItem(seenKey) || ""; } catch (e) { return ""; } }
    async function load() {
      var out = [], r = {};
      try { r = (await sb.rpc("my_notifications")).data || {}; } catch (e) {}
      function add(n, icon, text, href) { n = Number(n) || 0; if (n > 0) out.push({ n: n, icon: icon, text: text + (n > 1 ? " (" + n + ")" : ""), href: href }); }
      if (isT) {
        add(r.student_msgs, "✉️", "رسائل جديدة من الطلاب", "admin.html#messages"); add(r.name_req, "✏️", "طلبات تغيير اسم", "account.html"); add(r.new_students, "🧑‍🎓", "طلاب جدد ينتظرون القبول", "admin.html#applications");
      } else {
        add(r.teacher_msgs, "✉️", "رسالة جديدة من معلمك", "messages.html"); add(r.fr_req, "🤝", "طلب صداقة جديد", "friends.html"); add(r.fr_msgs, "💬", "رسالة جديدة من صديق", "friends.html");
        try {
          var an = (await sb.from("announcements").select("id,title,created_at").order("created_at", { ascending: false }).limit(6)).data || [], sn = seen(), cut = sn || new Date(Date.now() - 7 * 864e5).toISOString();
          an.filter(function (a) { return a.created_at > cut; }).forEach(function (a) { out.push({ n: 1, icon: "📢", text: "إعلان من المعلم: " + a.title, href: "dashboard.html" }); });
        } catch (e) {}
        try {
          var pl = (await sb.from("vote_polls").select("id,title,closes_at").eq("status", "open").limit(5)).data || [];
          for (var i = 0; i < pl.length; i++) { if (pl[i].closes_at && new Date(pl[i].closes_at) < new Date()) continue; var mv = await sb.from("votes").select("slot_id", { count: "exact", head: true }).eq("poll_id", pl[i].id).eq("user_id", uid); if (!(mv.count > 0)) out.push({ n: 1, icon: "🗳️", text: "تصويت متاح: " + pl[i].title, href: "schedule.html" }); }
        } catch (e) {}
        try {
          var dt = (await sb.from("dtasks").select("id,title,kind").order("created_at", { ascending: false }).limit(20)).data || [], dn = {}; ((await sb.from("dtask_done").select("task_id").eq("user_id", uid)).data || []).forEach(function (x) { dn[x.task_id] = 1; });
          var pend = dt.filter(function (t) { return !dn[t.id]; }); if (pend.length) out.push({ n: pend.length, icon: "✅", text: "مهام جديدة لك" + (pend.length > 1 ? " (" + pend.length + ")" : ""), href: "dashboard.html" });
        } catch (e) {}
      }
      items = out;
      var total = out.reduce(function (s, x) { return s + x.n; }, 0), nb = document.getElementById("kzBellN");
      if (nb) { nb.textContent = total > 99 ? "99+" : total; nb.style.display = total ? "block" : "none"; }
      if (panel) draw();
    }
    function draw() {
      var canPush = "Notification" in window && Notification.permission === "default";
      panel.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>🔔 الإشعارات</strong><button type="button" data-x style="border:0;background:none;font-size:20px;cursor:pointer;color:inherit">✕</button></div>' +
        (items.length ? items.map(function (x, i) { return '<a href="' + x.href + '" data-i="' + i + '" style="display:flex;gap:8px;align-items:center;padding:10px;border-radius:10px;background:rgba(212,175,55,.14);margin-bottom:6px;color:inherit;text-decoration:none"><span style="font-size:1.2rem">' + x.icon + '</span><span>' + KZ.esc(x.text) + "</span></a>"; }).join("") : '<p style="margin:8px 0;opacity:.75">لا توجد إشعارات جديدة 🎉</p>') +
        (canPush ? '<button type="button" data-push style="margin-top:6px;width:100%;padding:9px;border-radius:10px;border:1px solid #D4AF37;background:none;color:inherit;cursor:pointer">تفعيل تنبيهات الجهاز أيضاً</button>' : "");
      panel.querySelector("[data-x]").onclick = function () { panel.remove(); panel = null; };
      panel.querySelectorAll("[data-i]").forEach(function (a) { a.addEventListener("click", function () { try { localStorage.setItem(seenKey, new Date().toISOString()); } catch (e) {} }); });
      var pb = panel.querySelector("[data-push]");
      if (pb) pb.onclick = async function () { try { await Notification.requestPermission(); } catch (e) {} if (Notification.permission === "granted") { var ok = await KZ.pushSubscribe(); KZ.toast(ok ? "تم تفعيل التنبيهات 🔔" : "تم التفعيل (تعمل والتطبيق مفتوح)."); } draw(); };
    }
    b.addEventListener("click", function () {
      if (panel) { panel.remove(); panel = null; return; }
      panel = document.createElement("div"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "الإشعارات");
      var x = Math.min(Math.max(8, b.offsetLeft), innerWidth - 300), y = Math.min(b.offsetTop + 52, innerHeight - 260);
      panel.style.cssText = "position:fixed;z-index:950;left:" + x + "px;top:" + Math.max(8, y) + "px;width:290px;max-width:calc(100vw - 16px);max-height:70vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#111);border:2px solid #D4AF37;border-radius:14px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.35)";
      document.body.appendChild(panel); draw(); load();
    });
    load(); setInterval(load, 20000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") load(); });
    KZ._bellRefresh = load;
  };
  // ----- colour themes chosen by the teacher: all / per level / per group -----
  KZ.themeMap = { primary: "--navy", deep: "--deep", accent: "--gold", accent2: "--gold-soft", bg: "--bg", surface: "--surface", text: "--text", link: "--link", muted: "--muted", line: "--line" };
  KZ.mix = function (c1, c2, t) {
    function h(x) { x = String(x).replace("#", ""); if (x.length === 3) x = x.split("").map(function (c) { return c + c; }).join(""); return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]; }
    var A = h(c1), B = h(c2); return "#" + A.map(function (v, i) { return ("0" + Math.round(v + (B[i] - v) * t).toString(16)).slice(-2); }).join("");
  };
  KZ.themeCss = function (v) {
    var s = ""; v = v || {}; var ok = function (x) { return x && /^#[0-9a-fA-F]{6}$/.test(x); };
    Object.keys(KZ.themeMap).forEach(function (k) { if (v[k] && /^#[0-9a-fA-F]{3,8}$/.test(v[k])) s += KZ.themeMap[k] + ":" + v[k] + ";"; });
    var out = s ? ':root:not([data-theme="dark"]){' + s + "}" : "";
    if (ok(v.primary)) {
      var p = v.primary, ac = ok(v.accent) ? v.accent : "#D4AF37";
      out += ':root[data-theme="dark"]{--navy:' + p + ";--deep:" + KZ.mix(p, "#000000", .42) + ";--bg:" + KZ.mix(p, "#000000", .42) + ";--surface:" + p + ";--surface-2:" + KZ.mix(p, "#ffffff", .1) + ";--line:" + KZ.mix(p, "#ffffff", .2) + ";--gold:" + ac + ";--gold-soft:" + KZ.mix(ac, "#ffffff", .3) + ";--link:" + KZ.mix(ac, "#ffffff", .3) + "}";
    }
    return out;
  };
  KZ.applyThemeVars = function (v) {
    var st = document.getElementById("kzTheme");
    if (!st) { st = document.createElement("style"); st.id = "kzTheme"; document.head.appendChild(st); }
    st.textContent = v ? KZ.themeCss(v) : "";
  };
  KZ.loadTheme = async function () {
    var key = "kz-theme-" + (KZ.user ? KZ.user.id : "");
    try { var c = localStorage.getItem(key); if (c) KZ.applyThemeVars(JSON.parse(c)); } catch (e) {}
    try {
      var rr = await KZ.sb.from("theme_rules").select("scope,scope_value,themes(vars)");
      var gids = [];
      if (KZ.profile && KZ.profile.role !== "teacher") gids = ((await KZ.sb.from("group_members").select("group_id")).data || []).map(function (x) { return String(x.group_id); });
      var rules = rr.data || [], lv = KZ.profile ? String(KZ.profile.level || "") : "";
      var pick = rules.find(function (r) { return r.scope === "group" && gids.indexOf(r.scope_value) >= 0; }) || rules.find(function (r) { return r.scope === "level" && r.scope_value === lv; }) || rules.find(function (r) { return r.scope === "all"; });
      var v = pick && pick.themes ? pick.themes.vars : null;
      KZ.applyThemeVars(v);
      try { if (v) localStorage.setItem(key, JSON.stringify(v)); else localStorage.removeItem(key); } catch (e) {}
    } catch (e) {}
  };
  // ----- certificate v4 -----
  KZ.certTypeAr = function (c) {
    var k = (c.kind || "completion");
    return { completion: "شهادة إتمام مستوى", participation: "شهادة مشاركة", excellence: "شهادة تفوّق", attendance: "شهادة حضور" }[k] || "";
  };
  KZ.certHtml = function (c, verifyUrl) {
    var LV = { A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper-Intermediate", C1: "Advanced" };
    var DEF = { completion: "has successfully completed the English course level", participation: "has actively participated in English classes at KIMZA Academy", excellence: "has shown outstanding performance and dedication to learning English", attendance: "has attended English classes at KIMZA Academy" };
    var isAr = function (t) { return /[؀-ۿ]/.test(t || ""); };
    var title = c.title && !isAr(c.title) ? c.title : ({ participation: "Certificate of Participation", excellence: "Certificate of Excellence", attendance: "Certificate of Attendance" }[c.kind] || "Certificate of Completion");
    title = title.toLowerCase().replace(/\b[a-z]/g, function (m) { return m.toUpperCase(); }).replace(/\bOf\b/g, "of");
    var body = c.body && !isAr(c.body) ? c.body : (DEF[c.kind] || DEF.completion);
    var ar = isAr(c.holder_name), nm = esc(c.holder_name || ""), long = (c.holder_name || "").length > 24;
    var dt = c.issued_on ? new Date(c.issued_on + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
    var emblem = '<svg class="c-emblem" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="gE" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F9E7A8"/><stop offset="1" stop-color="#C8A24A"/></linearGradient></defs><circle cx="50" cy="50" r="47" fill="url(#gE)"/><circle cx="50" cy="50" r="39" fill="#0B1F44"/><circle cx="50" cy="50" r="35" fill="none" stroke="#C8A24A" stroke-opacity=".6" stroke-width="1"/><path d="M50 24l7.4 15 16.6 2.4-12 11.7 2.8 16.5L50 61.8l-14.8 7.8L38 53.1 26 41.4 42.6 39z" fill="url(#gE)"/></svg>';
    return '<div class="cert-stage"><div class="cert-scale" id="certScale"><div class="cert2" id="certBox">' +
      '<div class="c-bg"></div><div class="c-dots"></div>' +
      '<div class="c-side"><i class="c-ring r1"></i><i class="c-ring r2"></i><i class="c-shine"></i><img class="c-logo" src="kimza-logo-gold.png" alt="KIMZA Academy">' +
      (c.level ? '<div class="c-lv">' + esc(c.level) + '</div><div class="c-lvn">' + esc(LV[c.level] || "") + " level</div>" : '<div class="c-lv" style="font-size:120px">&#10022;</div>') +
      '<div class="c-qrbox"><div id="qr"></div><span class="scan">Scan to verify</span><div class="no">' + esc(c.number || "") + '</div><div class="vf">' + esc(verifyUrl || "") + "</div></div></div>" +
      '<div class="c-main"><div class="c-kick">KIMZA Academy</div><div class="c-title">' + esc(title) + '</div><i class="c-bar"></i>' +
      '<div class="c-lead">This certificate is proudly presented to</div>' +
      '<div class="c-name' + (ar ? " ar" : "") + (long ? " long" : "") + '" dir="auto">' + nm + '</div><div class="c-line"></div>' +
      '<p class="c-body">' + esc(body) + ".</p>" +
      '<div class="c-meta">' + (c.level ? '<span class="c-level">' + esc(c.level) + " · " + esc(LV[c.level] || "") + "</span>" : "") + "</div>" +
      '<div class="c-foot"><div class="c-sig"><b>' + esc(dt) + '</b>Date of issue</div>' + emblem + '<div class="c-sig has-sign"><img class="c-signimg" src="signature.svg" alt="Signature of the Academy Director"><b>Academy Director</b>KIMZA Academy</div></div></div>' +
      (c.status && c.status !== "valid" ? '<div class="c-rev"><b>REVOKED</b></div>' : "") +
      "</div></div></div>";
  };
  KZ.fitCert = function () {
    var sc = document.getElementById("certScale"); if (!sc) return;
    var w = sc.parentNode.clientWidth || 1123, k = Math.min(1, (w - 8) / 1123);
    sc.style.transform = "scale(" + k + ")"; sc.parentNode.style.height = Math.round(794 * k) + "px";
    sc.style.marginInline = "0";
  };
  window.addEventListener("resize", function () { try { KZ.fitCert(); } catch (e) {} });
  window.addEventListener("beforeprint", function () { var sc = document.getElementById("certScale"); if (sc) { sc.style.transform = "none"; sc.parentNode.style.height = "auto"; } });
  window.addEventListener("afterprint", function () { try { KZ.fitCert(); } catch (e) {} });
  // ----- /certificate v4 -----
  // ----- look v4 -----
  // student-chosen look: palette, text size, motion (saved on this device only)
  KZ.PALETTES = [
    ["الملكي (الأصلي)", "#0B1F44", "#D4AF37", "#F8F4E9", "#FFFDF7", "#0B1F44", "#7A0F2D", "#475569", "#E7E7EA"],
    ["زمردي", "#0F3D3A", "#E0B84C", "#F1F6F2", "#FBFEFB", "#0F2B29", "#0F6B5E", "#4A6360", "#DCE6E2"],
    ["غابة", "#1B4332", "#F4A261", "#F0F7EE", "#FBFFFA", "#14301F", "#2D6A4F", "#4F6B5A", "#D8E8D5"],
    ["محيطي", "#0B3C5D", "#F2A541", "#EEF5FA", "#FBFDFF", "#0B2A3F", "#1766A6", "#4B6478", "#D9E5EE"],
    ["سماوي", "#12457A", "#F7B32B", "#EFF6FD", "#FCFEFF", "#0E2F52", "#1D78C9", "#4C6580", "#D6E6F5"],
    ["فيروزي", "#0B5563", "#FFB703", "#ECF8FA", "#F9FEFF", "#08404B", "#0F8FA3", "#47686E", "#CFE8EC"],
    ["بنفسجي", "#3B1F5C", "#E3B45C", "#F6F1FA", "#FFFCFF", "#2A1646", "#7A2E8E", "#5E5470", "#E5DCEE"],
    ["لافندر", "#4B3F8F", "#F2C14E", "#F3F2FC", "#FDFDFF", "#2B2560", "#6D5FD0", "#5A5878", "#DEDDF3"],
    ["غروب", "#7A2E12", "#F2B544", "#FBF3EA", "#FFFCF8", "#3B1A0B", "#B4461E", "#6B5446", "#EDDFD2"],
    ["عنابي", "#6A1B2D", "#E6B25A", "#FBF1F2", "#FFFBFB", "#3A0F19", "#B3243F", "#6E5258", "#F0D9DC"],
    ["وردي", "#5C1F3B", "#E8A5B8", "#FCF1F4", "#FFFBFC", "#3B1426", "#B02E5E", "#6B5560", "#F0DDE3"],
    ["فحمي وذهبي", "#222222", "#D4AF37", "#F6F4EF", "#FFFFFF", "#1A1A1A", "#8C6D0F", "#555555", "#E6E2D8"]
  ];
  KZ.look = function () { try { return Object.assign({ pal: -1, fs: 1, motion: true }, JSON.parse(localStorage.getItem("kz-look") || "{}")); } catch (e) { return { pal: -1, fs: 1, motion: true }; } };
  KZ.applyLook = function () {
    var L = KZ.look(), st = document.getElementById("kzLook");
    if (!st) { st = document.createElement("style"); st.id = "kzLook"; document.head.appendChild(st); }
    var css = "", p = KZ.PALETTES[L.pal];
    if (p) {
      var v = { primary: p[1], deep: p[1], accent: p[2], accent2: p[2], bg: p[3], surface: p[4], text: p[5], link: p[6], muted: p[7], line: p[8] };
      css = KZ.themeCss(v).replace(/:root:not/g, "html:root:not").replace(/:root\[data-theme="dark"\]/g, 'html:root[data-theme="dark"]');
    }
    st.textContent = css + ":root{--kz-fs:" + (Number(L.fs) || 1) + "}";
    document.documentElement.setAttribute("data-motion", L.motion === false ? "off" : "on");
  };
  KZ.saveLook = function (patch) { var L = Object.assign(KZ.look(), patch); try { localStorage.setItem("kz-look", JSON.stringify(L)); } catch (e) {} KZ.applyLook(); };
  KZ.openLook = function () {
    var old = document.getElementById("kzLookOv"); if (old) old.remove();
    var L = KZ.look(), ov = document.createElement("div"); ov.className = "look-ov"; ov.id = "kzLookOv";
    function draw() {
      L = KZ.look();
      ov.innerHTML = '<div class="look-box" role="dialog" aria-label="مظهري"><div style="display:flex;justify-content:space-between;align-items:center"><h2>🎨 مظهري</h2><button class="btn btn-ghost sm" type="button" id="lkX" aria-label="إغلاق">✕</button></div>' +
        '<p class="muted" style="margin:0">اختر الألوان التي تحبها. يُحفظ اختيارك على جهازك فقط.</p>' +
        '<div class="look-grid">' + KZ.PALETTES.map(function (p, i) { return '<button type="button" class="look-sw" data-pal="' + i + '" aria-pressed="' + (L.pal === i) + '"><i><b style="background:' + p[1] + '"></b><b style="background:' + p[2] + '"></b><b style="background:' + p[3] + '"></b><b style="background:' + p[6] + '"></b></i>' + p[0] + "</button>"; }).join("") + "</div>" +
        '<div class="look-row"><strong>حجم الخط</strong><div class="btns"><button class="btn btn-ghost sm" data-fs="0.92" type="button">أصغر</button><button class="btn btn-ghost sm" data-fs="1" type="button">عادي</button><button class="btn btn-ghost sm" data-fs="1.12" type="button">أكبر</button><button class="btn btn-ghost sm" data-fs="1.25" type="button">كبير جداً</button></div></div>' +
        '<div class="look-row"><strong>الحركة والتأثيرات</strong><div class="btns"><button class="btn ' + (L.motion === false ? "btn-ghost" : "btn-primary") + ' sm" data-mo="1" type="button">تشغيل</button><button class="btn ' + (L.motion === false ? "btn-primary" : "btn-ghost") + ' sm" data-mo="0" type="button">إيقاف</button></div></div>' +
        '<div class="look-row"><strong>جرّب الاحتفال</strong><div class="btns"><button class="btn btn-ghost sm" id="lkC" type="button">🎉</button><button class="btn btn-ghost sm" id="lkR" type="button">إعادة الضبط</button></div></div></div>';
      ov.querySelector("#lkX").onclick = function () { ov.remove(); };
      ov.querySelectorAll("[data-pal]").forEach(function (b) { b.onclick = function () { KZ.saveLook({ pal: Number(b.getAttribute("data-pal")) }); draw(); }; });
      ov.querySelectorAll("[data-fs]").forEach(function (b) { b.onclick = function () { KZ.saveLook({ fs: Number(b.getAttribute("data-fs")) }); }; });
      ov.querySelectorAll("[data-mo]").forEach(function (b) { b.onclick = function () { KZ.saveLook({ motion: b.getAttribute("data-mo") === "1" }); draw(); }; });
      ov.querySelector("#lkC").onclick = function () { KZ.confetti(); };
      ov.querySelector("#lkR").onclick = function () { try { localStorage.removeItem("kz-look"); } catch (e) {} KZ.applyLook(); draw(); };
    }
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    document.addEventListener("keydown", function esc2(e) { if (e.key === "Escape") { ov.remove(); document.removeEventListener("keydown", esc2); } });
    draw(); document.body.appendChild(ov);
  };
  KZ.confetti = function () {
    if (document.documentElement.getAttribute("data-motion") === "off" || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) return;
    var c = document.getElementById("kzConf") || document.createElement("canvas"); c.id = "kzConf"; document.body.appendChild(c);
    c.width = innerWidth; c.height = innerHeight; var x = c.getContext("2d"), cols = ["#D4AF37", "#F4D98A", "#7A0F2D", "#F8F4E9", "#17356E", "#E8A5B8"], P = [];
    for (var i = 0; i < 140; i++) P.push({ x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function f(t) {
      var k = (t - t0) / 2600; x.clearRect(0, 0, c.width, c.height);
      P.forEach(function (p) { p.vy += .32; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr; x.save(); x.globalAlpha = Math.max(0, 1 - k); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    })(t0);
  };
  KZ.initReveal = function () {
    if (KZ._rv || !("IntersectionObserver" in window)) return; KZ._rv = true;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .06 });
    function scan() { document.querySelectorAll(".app-main .tile,.app-main .lcard,.app-main .dhero,.app-main .ring,.app-main h2,.app-main .row").forEach(function (el) { if (el.__rv) return; el.__rv = 1; el.classList.add("kz-rv"); io.observe(el); }); }
    scan(); var host = document.getElementById("app") || document.body; new MutationObserver(function () { scan(); }).observe(host, { childList: true, subtree: true });
  };
  KZ.applyLook();
  // ----- /look v4 -----
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
  KZ.pageKey = function () {
    var f = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
    if (f === "lesson") { var m = /[?&]id=([^&]+)/.exec(location.search); if (m) return "lesson:" + decodeURIComponent(m[1]); }
    return f;
  };
  KZ.logAct = function (kind, lesson, n) { try { if (KZ.profile && KZ.profile.role === "student") sb.rpc("log_activity", { p_kind: kind, p_lesson: lesson || "", p_n: n || 1 }); } catch (e) {} };
  // Notifications: nav badges, page-title counter and (when allowed) system notifications. Polls every 40 s.
  KZ.notifyStart = function () {
    if (KZ._notif) return; KZ._notif = true;
    var base = document.title.replace(/^(d+)s*/, "");
    var LAB = { teacher_msgs: "رسالة جديدة من معلمك", fr_req: "طلب صداقة جديد", fr_msgs: "رسالة جديدة من صديق", student_msgs: "رسالة جديدة من طالب", name_req: "طلب تغيير اسم", new_students: "طالب جديد ينتظر القبول" };
    var LINK = { teacher_msgs: "messages.html", fr_req: "friends.html", fr_msgs: "friends.html", student_msgs: "admin.html#messages", name_req: "account.html", new_students: "admin.html#students" };
    var bell = document.getElementById("bellBtn");
    function bellState() { if (!bell) return; if (!("Notification" in window) || Notification.permission === "granted" || Notification.permission === "denied") bell.hidden = true; else bell.hidden = false; }
    if (bell) bell.addEventListener("click", async function () { try { await Notification.requestPermission(); } catch (e) {} bellState(); if (Notification.permission === "granted") { var ok = await KZ.pushSubscribe(); KZ.toast(ok ? "تم تفعيل الإشعارات 🔔 ستصلك حتى والتطبيق مغلق." : "تم تفعيل الإشعارات (تعمل والتطبيق مفتوح)."); } });
    if ("Notification" in window && Notification.permission === "granted") KZ.pushSubscribe();
    bellState();
    function badge(href, n) {
      var l = document.querySelector('#appHeader nav a[href="' + href + '"]'); if (!l) return;
      var b = l.querySelector(".nbadge"); if (b) b.remove();
      if (n > 0) l.insertAdjacentHTML("beforeend", ' <span class="nbadge">' + n + "</span>");
    }
    async function poll() {
      if (document.visibilityState !== "visible") return;
      var r; try { r = (await sb.rpc("my_notifications")).data || {}; } catch (e) { return; }
      var total = 0; Object.keys(r).forEach(function (k) { total += Number(r[k]) || 0; });
      document.title = (total ? "(" + total + ") " : "") + base;
      badge("messages.html", Number(r.teacher_msgs) || 0);
      badge("friends.html", (Number(r.fr_req) || 0) + (Number(r.fr_msgs) || 0));
      badge("admin.html", (Number(r.student_msgs) || 0) + (Number(r.new_students) || 0));
      badge("account.html", Number(r.name_req) || 0);
      var key = "kz-notif-" + (KZ.user ? KZ.user.id : ""), old = {}; try { old = JSON.parse(localStorage.getItem(key) || "{}"); } catch (e) {}
      Object.keys(r).forEach(function (k) {
        var n = Number(r[k]) || 0, o = Number(old[k]) || 0;
        if (n > o) {
          KZ.toast("🔔 " + LAB[k] + (n > 1 ? " (" + n + ")" : ""));
          if ("Notification" in window && Notification.permission === "granted") { try { var nt = new Notification("KIMZA Academy", { body: LAB[k], icon: "icon-192.png", tag: "kz-" + k }); nt.onclick = function () { window.focus(); location.href = LINK[k]; }; } catch (e) {} }
        }
      });
      try { localStorage.setItem(key, JSON.stringify(r)); } catch (e) {}
      try { if (KZ._bellRefresh) KZ._bellRefresh(); } catch (e) {}
    }
    setTimeout(poll, 1500); setInterval(poll, 20000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") poll(); });
  };
  // Web Push: register this device so the server can notify even when the app is closed
  function b64(u) { var p = "=".repeat((4 - u.length % 4) % 4), s = (u + p).replace(/-/g, "+").replace(/_/g, "/"), r = atob(s), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  KZ.pushSubscribe = async function () {
    try {
      var key = window.KIMZA_SUPABASE && window.KIMZA_SUPABASE.vapidPublic;
      if (!key || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || Notification.permission !== "granted") return false;
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      var j = sub.toJSON(), mark = "kz-push-" + (KZ.user ? KZ.user.id : "");
      if (localStorage.getItem(mark) === j.endpoint) return true;
      var r = await sb.rpc("save_push_sub", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
      if (!r.error) { try { localStorage.setItem(mark, j.endpoint); } catch (e) {} return true; }
    } catch (e) {}
    return false;
  };
  KZ.track = function () {
    if (KZ._tracking) return; KZ._tracking = true;
    var lastAct = Date.now();
    ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
    setInterval(function () {
      if (document.visibilityState === "visible" && Date.now() - lastAct < 120000) { try { sb.rpc("track_time", { p_seconds: 30 }); sb.rpc("track_page", { p_page: KZ.pageKey(), p_seconds: 30 }); } catch (e) {} }
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
    if (KZ.profile && (KZ.profile.role === "teacher" || KZ.profile.role === "staff")) return;
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


/* official-link banner (only on the old github.io address) + Android app button (login and home pages, Android phones only); both can be switched off in the teacher panel (Features) */
(function () {
  var OFFICIAL = "https://kimza-academy.netlify.app/", APK = "https://kimza-academy.netlify.app/KIMZA-Academy.apk";
  function ready(f) { if (document.readyState !== "loading") f(); else document.addEventListener("DOMContentLoaded", f); }
  ready(function () {
    var cfg = window.KIMZA_SUPABASE, flags = {};
    function run() {
      try {
        var host = location.hostname, p = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
        var ar = (document.documentElement.lang || "ar").indexOf("ar") === 0;
        if (/github\.io$/.test(host) && flags.official_banner !== false && !sessionStorage.getItem("kz-official-closed")) {
          var b = document.createElement("div"); b.setAttribute("role", "region"); b.setAttribute("aria-label", "official link");
          b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#D4AF37;color:#0B1F44;padding:8px 12px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;font:700 14px/1.5 Tajawal,Tahoma,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3)";
          b.innerHTML = '<span>' + (ar ? "📢 الرابط الرسمي الجديد للأكاديمية:" : "📢 Our new official link:") + ' <strong dir="ltr">kimza-academy.netlify.app</strong></span><a href="' + OFFICIAL + '" style="background:#0B1F44;color:#fff;padding:5px 14px;border-radius:999px;text-decoration:none">' + (ar ? "افتح الرابط الجديد" : "Open it") + '</a><button type="button" aria-label="close" style="border:0;background:none;font-size:20px;cursor:pointer;color:#0B1F44;line-height:1">×</button>';
          b.querySelector("button").onclick = function () { b.remove(); document.body.style.paddingTop = ""; try { sessionStorage.setItem("kz-official-closed", "1"); } catch (e) {} };
          document.body.appendChild(b); document.body.style.paddingTop = "46px";
        }
        if (/Android/i.test(navigator.userAgent) && flags.apk_button !== false && (p === "index" || p === "login" || p === "") && !(window.matchMedia && matchMedia("(display-mode: standalone)").matches)) {
          var a = document.createElement("a"); a.href = APK; a.setAttribute("download", "KIMZA-Academy.apk");
          a.style.cssText = "position:fixed;bottom:14px;left:14px;z-index:9998;background:#0B1F44;color:#F8F4E9;border:2px solid #D4AF37;padding:9px 16px;border-radius:999px;text-decoration:none;font:700 14px/1.4 Tajawal,Tahoma,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)";
          a.textContent = ar ? "📱 تحميل تطبيق الأندرويد" : "📱 Download the Android app";
          document.body.appendChild(a);
        }
      } catch (e) {}
    }
    if (!cfg || !window.fetch) { run(); return; }
    fetch(cfg.url + "/rest/v1/site_features?select=key,enabled&key=in.(official_banner,apk_button)", { headers: { apikey: cfg.publishableKey } })
      .then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
      .then(function (rows) { rows.forEach(function (f) { flags[f.key] = f.enabled; }); run(); });
  });
})();
