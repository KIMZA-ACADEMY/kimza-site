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
    return prof;
  }

  function shell(active) {
    var prof = KZ.profile;
    var isT = prof && prof.role === "teacher";
    var links = isT
      ? [["admin.html", "لوحة المعلم", "admin"]]
      : [["dashboard.html", "الرئيسية", "home"], ["review.html", "المراجعة", "review"], ["flashcards.html", "البطاقات", "cards"], ["attendance.html", "الحضور", "att"], ["speaking.html", "المحادثة", "speak"], ["certificates.html", "الشهادات", "cert"]];
    var h = '<div class="wrap"><a href="' + (isT ? "admin.html" : "dashboard.html") + '"><img src="kimza-logo-gold.png" alt="KIMZA Academy"></a>' +
      '<nav class="links" aria-label="Main">' + links.map(function (l) { return '<a href="' + l[0] + '"' + (l[2] === active ? ' aria-current="page"' : "") + ">" + l[1] + "</a>"; }).join("") +
      '<span class="who">' + esc(prof ? prof.full_name : "") + '</span><button class="btn btn-ghost sm" id="logoutBtn" type="button" style="color:var(--cream)">خروج</button></nav></div>';
    var el = document.getElementById("appHeader");
    if (el) el.innerHTML = h;
    var lb = document.getElementById("logoutBtn");
    if (lb) lb.addEventListener("click", async function () { await sb.auth.signOut(); location.href = "login.html"; });
  }

  var KZ = { sb: sb, esc: esc, fmtDate: fmtDate, toast: toast, errMsg: errMsg, requireAuth: requireAuth, shell: shell, DOMAIN: DOMAIN, profile: null, user: null };
  window.KZ = KZ;

  // Copy protection helper for exam pages
  KZ.blockCopy = function () {
    ["copy", "cut", "paste", "contextmenu", "dragstart", "selectstart"].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }); });
    document.addEventListener("keydown", function (e) {
      var k = (e.key || "").toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "u", "s", "p", "v"].indexOf(k) >= 0) e.preventDefault();
      if (e.key === "PrintScreen") e.preventDefault();
    });
    document.body.classList.add("nocopy");
  };
})();
