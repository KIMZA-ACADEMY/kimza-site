/* KZBoard: infinite whiteboard (pan / pinch-zoom, smooth pens, shapes, tables, notes, undo, autosave, PNG export). Teacher tool. */
var KZBoard = (function () {
  var COLORS = ["#111111", "#d32f2f", "#f57c00", "#fbc02d", "#2e7d32", "#0277bd", "#6a1b9a", "#ec407a", "#ffffff"];
  var NOTE_COLORS = ["#fff59d", "#ffcc80", "#a5d6a7", "#90caf9", "#f48fb1", "#ce93d8"];
  var WIDTHS = [2, 4, 8, 14, 26];
  var css = ".kzb{position:relative;width:100%;height:78vh;min-height:460px;background:#fbfbf8;border-radius:14px;overflow:hidden;border:1px solid rgba(128,128,128,.3);touch-action:none;user-select:none;-webkit-user-select:none;color:#111;font-family:Tajawal,sans-serif}" +
    ".kzb.fsb{height:100%;border-radius:0;border:0}.kzb canvas{display:block;width:100%;height:100%;touch-action:none}" +
    ".kzb-bar{position:absolute;left:50%;transform:translateX(-50%);bottom:10px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center;max-width:calc(100% - 16px);background:rgba(255,255,255,.96);border:1px solid #ccc;border-radius:14px;padding:6px 8px;box-shadow:0 6px 24px rgba(0,0,0,.25);z-index:5}" +
    ".kzb-top{position:absolute;top:8px;inset-inline-end:8px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;background:rgba(255,255,255,.96);border:1px solid #ccc;border-radius:12px;padding:5px 8px;box-shadow:0 4px 16px rgba(0,0,0,.2);z-index:5}" +
    ".kzb button,.kzb select{font:inherit;font-size:15px;min-width:36px;height:36px;border:1px solid #ccc;background:#fff;border-radius:9px;cursor:pointer;padding:0 8px;color:#111}" +
    ".kzb button[aria-pressed=true]{background:#0B1F44;color:#F8F4E9;border-color:#0B1F44}.kzb button:active{transform:scale(.96)}" +
    ".kzb .sw{width:26px;min-width:26px;height:26px;border-radius:50%;padding:0;border:2px solid #fff;box-shadow:0 0 0 1px #888}.kzb .sw[aria-pressed=true]{box-shadow:0 0 0 3px #0B1F44}" +
    ".kzb .sep{width:1px;height:26px;background:#ccc;margin:0 3px}.kzb .zl{min-width:48px;text-align:center;font-size:13px;color:#444}" +
    ".kzb-ctx{position:absolute;top:8px;inset-inline-start:8px;display:none;gap:4px;background:rgba(255,255,255,.96);border:1px solid #ccc;border-radius:12px;padding:5px 8px;z-index:5}" +
    ".kzb-ed{position:absolute;z-index:8;border:2px solid #0B1F44;background:#fff;color:#111;padding:2px 4px;font-family:Tajawal,sans-serif;resize:none;outline:none;overflow:hidden;line-height:1.35}" +
    ".kzb-msg{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#0B1F44;color:#fff;padding:5px 12px;border-radius:20px;font-size:13px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:9}";

  var BGS = [["أبيض","#fbfbf8"],["كريمي","#f6efdc"],["أسود","#111111"],["سبورة خضراء","#1f4d3a"],["كحلي","#0b1f44"],["رمادي","#3a3f47"]];
  function isDark(h) { var n = parseInt(String(h).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) < 110; }
  function isAr(s) { return /[؀-ۿ]/.test(s || ""); }
  function uid() { return Math.random().toString(36).slice(2, 9); }

  function mount(host, opts) {
    var sb = opts.sb, TABLE = opts.table || "lesson_boards", COL = opts.col || "lesson_id", lessonId = opts.val || opts.lessonId;
    if (!document.getElementById("kzb-css")) { var st = document.createElement("style"); st.id = "kzb-css"; st.textContent = css; document.head.appendChild(st); }
    host.innerHTML = "";
    var root = document.createElement("div"); root.className = "kzb"; root.tabIndex = 0; host.appendChild(root);
    var cv = document.createElement("canvas"); root.appendChild(cv);
    var ctx = cv.getContext("2d");
    var objs = [], view = { x: 0, y: 0, k: 1 }, tool = "pen", color = COLORS[0], width = WIDTHS[1], noteColor = NOTE_COLORS[0];
    var undoS = [], redoS = [], selId = null, cur = null, ptrs = {}, pinch = null, panning = null, dragSel = null, dirty = false, boardId = null, boards = [], saveT = null, editor = null, space = false, raf = 0;
    var W = 0, H = 0, dpr = 1, bg = BGS[0][1], imgData = {}, imgEls = {};

    // ---------- UI ----------
    var top = el("div", "kzb-top"), bar = el("div", "kzb-bar"), ctxbar = el("div", "kzb-ctx"), msg = el("div", "kzb-msg");
    root.appendChild(top); root.appendChild(bar); root.appendChild(ctxbar); root.appendChild(msg);
    function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
    function btn(label, title, fn, parent, tl) { var b = el("button"); b.type = "button"; b.innerHTML = label; b.title = title; if (tl) b.dataset.tool = tl; b.addEventListener("click", function (e) { e.stopPropagation(); fn(b); }); (parent || bar).appendChild(b); return b; }
    function sep(p) { (p || bar).appendChild(el("span", "sep")); }
    function flash(t) { msg.textContent = t; msg.style.opacity = 1; clearTimeout(flash.t); flash.t = setTimeout(function () { msg.style.opacity = 0; }, 1400); }

    var TOOLS = [["hand", "✋", "تحريك الشاشة (أو اسحب بالزر الأوسط / مسافة)"], ["select", "↖", "تحديد ونقل وتكبير"], ["pen", "✏️", "قلم"], ["marker", "🖍", "قلم تمييز"], ["eraser", "🧽", "ممحاة"],
      ["rect", "▭", "مستطيل"], ["ellipse", "◯", "دائرة / بيضاوي"], ["line", "╱", "خط"], ["arrow", "➜", "سهم"], ["text", "T", "نص"], ["note", "🗒", "ملاحظة لاصقة"], ["table", "▦", "جدول"]];
    var toolBtns = {};
    TOOLS.forEach(function (t) { toolBtns[t[0]] = btn(t[1], t[2], function () { setTool(t[0]); }, bar, t[0]); });
    sep();
    var swBtns = COLORS.map(function (c) { var b = el("button", "sw"); b.type = "button"; b.style.background = c; b.title = "لون"; b.addEventListener("click", function (e) { e.stopPropagation(); setColor(c); }); bar.appendChild(b); return b; });
    var wSel = el("select"); wSel.title = "سماكة الخط"; WIDTHS.forEach(function (w, i) { var o = el("option"); o.value = w; o.textContent = ["رفيع", "عادي", "سميك", "أسمك", "ضخم"][i]; wSel.appendChild(o); }); wSel.value = width;
    wSel.addEventListener("change", function () { width = Number(wSel.value); if (selId) { var o = byId(selId); if (o && (o.t === "s" || o.t === "l" || o.t === "ar")) { push(); o.w = width; redraw(); changed(); } else if (o && (o.t === "r" || o.t === "e")) { push(); o.sw = width; redraw(); changed(); } } }); bar.appendChild(wSel);
    var nSel = el("select"); nSel.title = "لون الملاحظة"; NOTE_COLORS.forEach(function (c, i) { var o = el("option"); o.value = c; o.textContent = "ملاحظة " + (i + 1); o.style.background = c; nSel.appendChild(o); }); nSel.addEventListener("change", function () { noteColor = nSel.value; }); bar.appendChild(nSel);
    sep();
    btn("↶", "تراجع (Ctrl+Z)", undo); btn("↷", "إعادة (Ctrl+Y)", redo);
    sep();
    btn("−", "تصغير", function () { zoomAt(W / 2, H / 2, 1 / 1.4); }); var zl = el("span", "zl"); zl.textContent = "100%"; bar.appendChild(zl); btn("+", "تكبير", function () { zoomAt(W / 2, H / 2, 1.4); });
    btn("⌂", "عرض كل المحتوى", fitAll); btn("1:1", "الحجم الطبيعي", function () { view.k = 1; view.x = W / 2; view.y = H / 2; redraw(); });

    // top bar: board selector, save, export, fullscreen
    var bSel = el("select"); bSel.title = "السبورات المحفوظة"; bSel.style.maxWidth = "150px"; top.appendChild(bSel);
    bSel.addEventListener("change", function () { if (bSel.value === "__new") { newBoard(); } else openBoard(Number(bSel.value)); });
    btn("✎", "تسمية السبورة", function () { var b = boards.filter(function (x) { return x.id === boardId; })[0]; if (!b) return; var n = prompt("اسم السبورة:", b.name); if (n) { b.name = n; sb.from(TABLE).update({ name: n }).eq("id", boardId).then(fillBoards); } }, top);
    var saveB = btn("💾", "حفظ السبورة الآن", function () { saveNow(true); }, top);
    btn("📷", "حفظ صورة", function () { var m = prompt("حفظ صورة:\n1 = ما يظهر على الشاشة الآن\n2 = السبورة كاملة", "2"); if (m === "1") exportPng(false); else if (m === "2") exportPng(true); }, top);
    btn("🗑", "مسح السبورة", function () { if (!objs.length) return; if (confirm("مسح كل محتوى هذه السبورة؟ (يمكنك التراجع بـ Ctrl+Z)")) { push(); objs = []; selId = null; redraw(); changed(); } }, top);
    btn("✕", "حذف هذه السبورة نهائياً", function () { if (!boardId || !confirm("حذف هذه السبورة نهائياً مع كل محتواها؟")) return; sb.from(TABLE).delete().eq("id", boardId).then(function () { boardId = null; init(); }); }, top);
    var bgSel = el("select"); bgSel.title = "لون السبورة"; BGS.forEach(function (b) { var o = el("option"); o.value = b[1]; o.textContent = "🎨 " + b[0]; bgSel.appendChild(o); }); bgSel.addEventListener("change", function () { setBg(bgSel.value); changed(); }); top.appendChild(bgSel);
    btn("🖼", "إدراج صورة (أو الصق صورة بـ Ctrl+V)", function () { var f = document.createElement("input"); f.type = "file"; f.accept = "image/*"; f.multiple = true; f.onchange = function () { Array.prototype.forEach.call(f.files, function (x) { addImageFile(x); }); }; f.click(); }, top);
    var saveS = el("span", "zl"); saveS.textContent = ""; top.appendChild(saveS);

    // context bar (table)
    function ctxShow() {
      var o = byId(selId); ctxbar.innerHTML = "";
      if (!o) { ctxbar.style.display = "none"; return; }
      if (o.t === "tb") {
        ctxbar.style.display = "flex";
        btn("＋صف", "إضافة صف", function () { push(); var r = []; for (var c = 0; c < o.cols; c++) r.push(""); o.cells.push(r); o.rows++; redraw(); changed(); }, ctxbar);
        btn("＋عمود", "إضافة عمود", function () { push(); o.cells.forEach(function (r) { r.push(""); }); o.cols++; redraw(); changed(); }, ctxbar);
        btn("−صف", "حذف صف", function () { if (o.rows > 1) { push(); o.cells.pop(); o.rows--; redraw(); changed(); } }, ctxbar);
        btn("−عمود", "حذف عمود", function () { if (o.cols > 1) { push(); o.cells.forEach(function (r) { r.pop(); }); o.cols--; redraw(); changed(); } }, ctxbar);
        btn("🗑", "حذف الجدول", delSel, ctxbar);
      } else { ctxbar.style.display = "flex"; if (o.t === "tx" || o.t === "n") btn("✎ تحرير", "تعديل النص", function () { editObj(o); }, ctxbar); btn("🗑", "حذف (Delete)", delSel, ctxbar); }
    }

    function setBg(v, silent) { bg = v; root.style.background = v; bgSel.value = v; var dk = isDark(v); if (!silent) { if (dk && color === "#111111") setColor("#ffffff"); else if (!dk && color === "#ffffff") setColor("#111111"); } redraw(); }
    function viewCenter() { return toWorld(W / 2, H / 2); }
    function fileToData(file) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { var im = new Image(); im.onload = function () { var s = Math.min(1, 1500 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * s)); c.height = Math.max(1, Math.round(im.height * s)); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); var png = file.type === "image/png", out = c.toDataURL(png ? "image/png" : "image/jpeg", 0.85); if (png && out.length > 900000) out = c.toDataURL("image/jpeg", 0.85); res({ src: out, w: c.width, h: c.height }); }; im.onerror = rej; im.src = fr.result; }; fr.onerror = rej; fr.readAsDataURL(file); }); }
    async function addImageFile(file, at) {
      try {
        var d = await fileToData(file), id = uid(), p = at || viewCenter(), mw = Math.max(120, W * 0.5 / view.k), sc = Math.min(1, mw / d.w);
        push(); imgData[id] = d.src; objs.push({ id: id, t: "img", x: p.x - d.w * sc / 2, y: p.y - d.h * sc / 2, w: d.w * sc, h: d.h * sc }); selId = id; setTool("select"); selId = id; ctxShow(); redraw(); changed(); flash("تمت إضافة الصورة");
      } catch (e) { flash("تعذر قراءة الصورة"); }
    }
    function addTextAt(t, p) { push(); var tx = { id: uid(), t: "tx", x: p.x, y: p.y, text: t.slice(0, 4000), size: 24, c: isDark(bg) ? "#ffffff" : color }; objs.push(tx); selId = tx.id; ctxShow(); redraw(); changed(); flash("تم لصق النص"); }
    function onPaste(e) {
      if (!root.isConnected || !root.offsetParent || editor) return;
      var ae = document.activeElement; if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && !root.contains(ae)) return;
      var cd = e.clipboardData; if (!cd) return; var did = false;
      Array.prototype.forEach.call(cd.items || [], function (it) { if (it.type && it.type.indexOf("image") === 0) { var f = it.getAsFile(); if (f) { addImageFile(f); did = true; } } });
      if (!did) { var t = cd.getData("text/plain"); if (t && t.trim()) { addTextAt(t, viewCenter()); did = true; } }
      if (did) e.preventDefault();
    }
    document.addEventListener("paste", onPaste);
    root.addEventListener("dragover", function (e) { e.preventDefault(); });
    root.addEventListener("drop", function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(), p = toWorld(e.clientX - r.left, e.clientY - r.top); var fs = e.dataTransfer && e.dataTransfer.files; if (fs && fs.length) { Array.prototype.forEach.call(fs, function (f) { if (f.type.indexOf("image/") === 0) addImageFile(f, p); }); } else { var t = e.dataTransfer && e.dataTransfer.getData("text/plain"); if (t && t.trim()) addTextAt(t, p); } });
    // ---------- model ----------
    function byId(id) { for (var i = 0; i < objs.length; i++) if (objs[i].id === id) return objs[i]; return null; }
    function snap() { return JSON.stringify(objs); }
    function push() { undoS.push(snap()); if (undoS.length > 80) undoS.shift(); redoS = []; }
    function undo() { if (!undoS.length) return; redoS.push(snap()); objs = JSON.parse(undoS.pop()); selId = null; ctxShow(); redraw(); changed(); }
    function redo() { if (!redoS.length) return; undoS.push(snap()); objs = JSON.parse(redoS.pop()); selId = null; ctxShow(); redraw(); changed(); }
    function delSel() { if (!selId) return; push(); objs = objs.filter(function (o) { return o.id !== selId; }); selId = null; ctxShow(); redraw(); changed(); }
    function changed() { dirty = true; saveS.textContent = "…"; clearTimeout(saveT); saveT = setTimeout(function () { saveNow(false); }, 1600); }

    // ---------- tools ----------
    function setTool(t) { tool = t; Object.keys(toolBtns).forEach(function (k) { toolBtns[k].setAttribute("aria-pressed", k === t ? "true" : "false"); }); if (t !== "select") { selId = null; ctxShow(); } root.style.cursor = t === "hand" ? "grab" : t === "select" ? "default" : t === "text" ? "text" : "crosshair"; redraw(); }
    function setColor(c) { color = c; swBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.style.background === hexToRgb(c) || b.title === c ? "true" : "false"); }); var o = byId(selId); if (o && o.t !== "n") { push(); if (o.t === "tb" || o.t === "tx" || o.t === "s" || o.t === "r" || o.t === "e" || o.t === "l" || o.t === "ar") o.c = c; redraw(); changed(); } }
    function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return "rgb(" + (n >> 16) + ", " + ((n >> 8) & 255) + ", " + (n & 255) + ")"; }
    swBtns.forEach(function (b, i) { b.dataset.c = COLORS[i]; });
    function markSw() { swBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.c === color ? "true" : "false"); }); }
    var _setColor = setColor; setColor = function (c) { _setColor(c); markSw(); };

    // ---------- coordinates ----------
    function toWorld(sx, sy) { return { x: (sx - view.x) / view.k, y: (sy - view.y) / view.k }; }
    function evPos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function zoomAt(sx, sy, f) { var nk = Math.min(200, Math.max(0.005, view.k * f)); f = nk / view.k; view.x = sx - (sx - view.x) * f; view.y = sy - (sy - view.y) * f; view.k = nk; redraw(); dirtyView(); }
    function dirtyView() { clearTimeout(dirtyView.t); dirtyView.t = setTimeout(function () { if (boardId) changed(); }, 800); }

    // ---------- geometry ----------
    function bounds(o) {
      if (o.t === "s") { var x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; o.p.forEach(function (q) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); var h = o.w / 2; return { x: x0 - h, y: y0 - h, w: x1 - x0 + o.w, h: y1 - y0 + o.w }; }
      if (o.t === "l" || o.t === "ar") { var a = Math.min(o.x, o.x2), b = Math.min(o.y, o.y2); return { x: a, y: b, w: Math.abs(o.x2 - o.x) || 1, h: Math.abs(o.y2 - o.y) || 1 }; }
      if (o.t === "tx") { var m = measureText(o); return { x: o.x, y: o.y, w: m.w, h: m.h }; }
      if (o.t === "tb") return { x: o.x, y: o.y, w: o.cw * o.cols, h: o.ch * o.rows };
      return { x: o.x, y: o.y, w: o.w, h: o.h };
    }
    function measureText(o) { ctx.font = o.size + "px Tajawal, sans-serif"; var ls = String(o.text || " ").split("\n"), w = 10; ls.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); }); return { w: w, h: ls.length * o.size * 1.35 }; }
    function distSeg(px, py, x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l)) : 0; return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)); }
    function hit(o, x, y, tol) {
      if (o.t === "s") { var p = o.p; if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) <= o.w / 2 + tol; for (var i = 0; i < p.length - 1; i++) if (distSeg(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]) <= o.w / 2 + tol) return true; return false; }
      if (o.t === "l" || o.t === "ar") return distSeg(x, y, o.x, o.y, o.x2, o.y2) <= o.w / 2 + tol;
      var b = bounds(o);
      if (o.t === "r" || o.t === "e") { if (o.f) return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol; var inO = x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol, inI = x > b.x + tol && x < b.x + b.w - tol && y > b.y + tol && y < b.y + b.h - tol; return inO && !inI; }
      return x >= b.x - tol && x <= b.x + b.w + tol && y >= b.y - tol && y <= b.y + b.h + tol;
    }
    function topAt(x, y, tol) { for (var i = objs.length - 1; i >= 0; i--) if (hit(objs[i], x, y, tol)) return objs[i]; return null; }
    function moveObj(o, dx, dy) { if (o.t === "s") o.p.forEach(function (q) { q[0] += dx; q[1] += dy; }); else { o.x += dx; o.y += dy; if (o.x2 != null) { o.x2 += dx; o.y2 += dy; } } }
    function scaleObj(o, b0, nw, nh) {
      var sx = nw / Math.max(1, b0.w), sy = nh / Math.max(1, b0.h);
      if (o.t === "s") { o.p.forEach(function (q) { q[0] = b0.x + (q[0] - b0.x) * sx; q[1] = b0.y + (q[1] - b0.y) * sy; }); }
      else if (o.t === "l" || o.t === "ar") { o.x2 = o.x + (o.x2 - o.x) * sx; o.y2 = o.y + (o.y2 - o.y) * sy; }
      else if (o.t === "tb") { o.cw = Math.max(30, nw / o.cols); o.ch = Math.max(20, nh / o.rows); }
      else if (o.t === "tx") { o.size = Math.max(8, o.size * sy); }
      else if (o.t === "img") { o.w = Math.max(20, nw); o.h = o.w * (b0.h / Math.max(1, b0.w)); }
      else { o.w = Math.max(10, nw); o.h = Math.max(10, nh); }
    }

    // ---------- rendering ----------
    function drawObj(c, o) {
      c.save(); c.lineCap = "round"; c.lineJoin = "round";
      if (o.t === "s") {
        c.strokeStyle = o.c; c.fillStyle = o.c; c.lineWidth = o.w; c.globalAlpha = o.a || 1; var p = o.p;
        if (p.length === 1) { c.beginPath(); c.arc(p[0][0], p[0][1], o.w / 2, 0, 7); c.fill(); }
        else { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length - 1; i++) { var mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(p[i][0], p[i][1], mx, my); } c.lineTo(p[p.length - 1][0], p[p.length - 1][1]); c.stroke(); }
      } else if (o.t === "r" || o.t === "e") {
        c.strokeStyle = o.c; c.lineWidth = o.sw || 4; c.beginPath();
        if (o.t === "r") { rr(c, o.x, o.y, o.w, o.h, 6); } else c.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, 7);
        c.stroke();
      } else if (o.t === "l" || o.t === "ar") {
        c.strokeStyle = o.c; c.fillStyle = o.c; c.lineWidth = o.w; c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x2, o.y2); c.stroke();
        if (o.t === "ar") { var an = Math.atan2(o.y2 - o.y, o.x2 - o.x), hl = Math.max(14, o.w * 4); c.beginPath(); c.moveTo(o.x2, o.y2); c.lineTo(o.x2 - hl * Math.cos(an - 0.45), o.y2 - hl * Math.sin(an - 0.45)); c.lineTo(o.x2 - hl * Math.cos(an + 0.45), o.y2 - hl * Math.sin(an + 0.45)); c.closePath(); c.fill(); }
      } else if (o.t === "tx") {
        c.fillStyle = o.c; c.font = o.size + "px Tajawal, sans-serif"; c.textBaseline = "top"; var ls = String(o.text || "").split("\n"), m = measureText(o);
        ls.forEach(function (l, i) { var ar = isAr(l); c.direction = ar ? "rtl" : "ltr"; c.textAlign = ar ? "right" : "left"; c.fillText(l, ar ? o.x + m.w : o.x, o.y + i * o.size * 1.35); });
      } else if (o.t === "tb") {
        c.strokeStyle = o.c; c.lineWidth = 2; c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(o.x, o.y, o.cw * o.cols, o.ch * o.rows);
        c.fillStyle = "rgba(13,31,68,.08)"; c.fillRect(o.x, o.y, o.cw * o.cols, o.ch);
        c.beginPath(); for (var r = 0; r <= o.rows; r++) { c.moveTo(o.x, o.y + r * o.ch); c.lineTo(o.x + o.cw * o.cols, o.y + r * o.ch); } for (var k = 0; k <= o.cols; k++) { c.moveTo(o.x + k * o.cw, o.y); c.lineTo(o.x + k * o.cw, o.y + o.ch * o.rows); } c.stroke();
        c.fillStyle = o.c; var fs = Math.min(o.ch * .5, 22); c.font = fs + "px Tajawal, sans-serif"; c.textBaseline = "middle";
        for (var rr_ = 0; rr_ < o.rows; rr_++) for (var cc = 0; cc < o.cols; cc++) { var tx = (o.cells[rr_] && o.cells[rr_][cc]) || ""; if (!tx) continue; var ar2 = isAr(tx); c.direction = ar2 ? "rtl" : "ltr"; c.textAlign = "center"; c.fillText(tx, o.x + cc * o.cw + o.cw / 2, o.y + rr_ * o.ch + o.ch / 2, o.cw - 8); }
      } else if (o.t === "img") {
        var im = getImg(o); if (im && im.complete && im.naturalWidth) c.drawImage(im, o.x, o.y, o.w, o.h); else { c.fillStyle = "rgba(128,128,128,.3)"; c.fillRect(o.x, o.y, o.w, o.h); }
      } else if (o.t === "n") {
        c.shadowColor = "rgba(0,0,0,.25)"; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = o.c; c.beginPath(); rr(c, o.x, o.y, o.w, o.h, 8); c.fill(); c.shadowColor = "transparent";
        c.fillStyle = "#222"; var nf = 20; c.font = nf + "px Tajawal, sans-serif"; c.textBaseline = "top"; wrapLines(c, o.text || "", o.w - 20).forEach(function (l, i) { var ar = isAr(l); c.direction = ar ? "rtl" : "ltr"; c.textAlign = ar ? "right" : "left"; c.fillText(l, ar ? o.x + o.w - 10 : o.x + 10, o.y + 10 + i * nf * 1.35); });
      }
      c.restore();
    }
    function getImg(o) { var e = imgEls[o.id]; if (!e) { e = new Image(); e.onload = function () { redraw(); }; e.src = imgData[o.id] || ""; imgEls[o.id] = e; } return e; }
    function rr(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
    function wrapLines(c, text, maxW) { var out = []; String(text).split("\n").forEach(function (par) { var words = par.split(" "), line = ""; words.forEach(function (w) { var t = line ? line + " " + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }); out.push(line); }); return out; }
    function drawScene(c, v, w, h, withGrid, bg) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg || "#fbfbf8"; c.fillRect(0, 0, w, h); var dotc = isDark(bg || "#fbfbf8") ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.18)";
      if (withGrid) { var step = 40; while (step * v.k < 18) step *= 2; while (step * v.k > 70) step /= 2; var x0 = Math.floor(-v.x / v.k / step) * step, y0 = Math.floor(-v.y / v.k / step) * step; c.fillStyle = dotc; for (var gx = x0; gx < (w - v.x) / v.k; gx += step) for (var gy = y0; gy < (h - v.y) / v.k; gy += step) c.fillRect(gx * v.k + v.x - 1, gy * v.k + v.y - 1, 2, 2); }
      c.setTransform(v.k, 0, 0, v.k, v.x, v.y);
    }
    function redraw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; render(); }); }
    function render() {
      var v = { x: view.x, y: view.y, k: view.k };
      drawScene(ctx, { x: view.x * dpr, y: view.y * dpr, k: view.k * dpr }, cv.width, cv.height, true, bg);
      objs.forEach(function (o) { drawObj(ctx, o); });
      if (cur) drawObj(ctx, cur);
      var so = byId(selId);
      if (so) { var b = bounds(so); ctx.save(); ctx.strokeStyle = "#1e88e5"; ctx.lineWidth = 1.5 / v.k; ctx.setLineDash([6 / v.k, 4 / v.k]); ctx.strokeRect(b.x - 4 / v.k, b.y - 4 / v.k, b.w + 8 / v.k, b.h + 8 / v.k); ctx.setLineDash([]); ctx.fillStyle = "#1e88e5"; var hs = 9 / v.k; ctx.fillRect(b.x + b.w + 4 / v.k - hs / 2, b.y + b.h + 4 / v.k - hs / 2, hs, hs); ctx.restore(); }
      zl.textContent = Math.round(view.k * 100) + "%";
    }
    function resize() { var r = root.getBoundingClientRect(); W = Math.max(100, r.width); H = Math.max(100, r.height); dpr = window.devicePixelRatio || 1; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); redraw(); }
    var ro = window.ResizeObserver ? new ResizeObserver(resize) : null; if (ro) ro.observe(root); window.addEventListener("resize", resize);

    // ---------- pointer input ----------
    function handleAt(wx, wy) { var o = byId(selId); if (!o) return false; var b = bounds(o), t = 12 / view.k; return Math.abs(wx - (b.x + b.w + 4 / view.k)) < t && Math.abs(wy - (b.y + b.h + 4 / view.k)) < t; }
    cv.addEventListener("pointerdown", function (e) {
      if (editor) commitEditor();
      root.focus({ preventScroll: true });
      cv.setPointerCapture(e.pointerId); var p = evPos(e); ptrs[e.pointerId] = { x: p.x, y: p.y, type: e.pointerType };
      var ids = Object.keys(ptrs);
      if (ids.length === 2) { cur = null; dragSel = null; var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return; }
      if (ids.length > 2) return;
      var w = toWorld(p.x, p.y);
      if (e.button === 1 || e.button === 2 || tool === "hand" || space) { panning = { x: p.x, y: p.y, vx: view.x, vy: view.y }; root.style.cursor = "grabbing"; return; }
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (tool === "select") {
        if (handleAt(w.x, w.y)) { var so = byId(selId); push(); dragSel = { mode: "scale", o: so, b0: bounds(so), orig: JSON.parse(JSON.stringify(so)) }; return; }
        var o = topAt(w.x, w.y, 6 / view.k); selId = o ? o.id : null; ctxShow(); if (o) { push(); dragSel = { mode: "move", o: o, lx: w.x, ly: w.y, moved: false }; } redraw(); return;
      }
      if (tool === "eraser") { push(); eraseAt(w); dragSel = { mode: "erase" }; return; }
      if (tool === "pen" || tool === "marker") { cur = { id: uid(), t: "s", c: color, w: tool === "marker" ? Math.max(width * 3, 14) : width, a: tool === "marker" ? 0.35 : 1, p: [[w.x, w.y]] }; redraw(); return; }
      if (tool === "rect" || tool === "ellipse") { cur = { id: uid(), t: tool === "rect" ? "r" : "e", c: color, sw: width, x: w.x, y: w.y, w: 0, h: 0, _x0: w.x, _y0: w.y }; redraw(); return; }
      if (tool === "line" || tool === "arrow") { cur = { id: uid(), t: tool === "line" ? "l" : "ar", c: color, w: width, x: w.x, y: w.y, x2: w.x, y2: w.y }; redraw(); return; }
      if (tool === "text") { push(); var tx = { id: uid(), t: "tx", x: w.x, y: w.y, text: "", size: Math.max(20, width * 4), c: color }; objs.push(tx); selId = tx.id; editObj(tx, true); return; }
      if (tool === "note") { push(); var n = { id: uid(), t: "n", x: w.x - 100, y: w.y - 70, w: 220, h: 160, c: noteColor, text: "" }; objs.push(n); selId = n.id; setTool("select"); selId = n.id; ctxShow(); redraw(); changed(); editObj(n, true); return; }
      if (tool === "table") { var rc = prompt("عدد الصفوف والأعمدة (مثال: 4x3 تعني 4 صفوف و3 أعمدة):", "4x3"); if (!rc) return; var m = /(\d+)\s*[x×*,]\s*(\d+)/i.exec(rc) || [0, 3, 3], rows = Math.min(30, Math.max(1, +m[1])), cols = Math.min(15, Math.max(1, +m[2])); push(); var cells = []; for (var r = 0; r < rows; r++) { var row = []; for (var c2 = 0; c2 < cols; c2++) row.push(""); cells.push(row); } var tb = { id: uid(), t: "tb", x: w.x, y: w.y, rows: rows, cols: cols, cw: 150, ch: 46, c: color === "#ffffff" ? "#111111" : color, cells: cells }; objs.push(tb); setTool("select"); selId = tb.id; ctxShow(); redraw(); changed(); return; }
    });
    cv.addEventListener("pointermove", function (e) {
      var p = evPos(e); var pt = ptrs[e.pointerId]; if (pt) { pt.x = p.x; pt.y = p.y; }
      if (pinch) { var ids = Object.keys(ptrs); if (ids.length >= 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; if (d > 0) { view.x += cx - pinch.cx; view.y += cy - pinch.cy; zoomAt(cx, cy, d / pinch.d); } pinch.d = d; pinch.cx = cx; pinch.cy = cy; } return; }
      if (panning) { view.x = panning.vx + (p.x - panning.x); view.y = panning.vy + (p.y - panning.y); redraw(); return; }
      if (!pt) return;
      var w = toWorld(p.x, p.y);
      if (dragSel) {
        if (dragSel.mode === "move") { moveObj(dragSel.o, w.x - dragSel.lx, w.y - dragSel.ly); dragSel.lx = w.x; dragSel.ly = w.y; dragSel.moved = true; redraw(); }
        else if (dragSel.mode === "scale") { var b0 = dragSel.b0; Object.assign(dragSel.o, JSON.parse(JSON.stringify(dragSel.orig))); scaleObj(dragSel.o, b0, Math.max(10, w.x - b0.x), Math.max(10, w.y - b0.y)); redraw(); }
        else if (dragSel.mode === "erase") eraseAt(w);
        return;
      }
      if (!cur) return;
      if (cur.t === "s") { var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs || !evs.length) evs = [e]; evs.forEach(function (ev) { var q = toWorld(ev.clientX - cv.getBoundingClientRect().left, ev.clientY - cv.getBoundingClientRect().top), l = cur.p[cur.p.length - 1]; if (Math.hypot(q.x - l[0], q.y - l[1]) * view.k > 1.2) cur.p.push([q.x, q.y]); }); }
      else if (cur.t === "r" || cur.t === "e") { var x1 = Math.min(cur._x0, w.x), y1 = Math.min(cur._y0, w.y); cur.x = x1; cur.y = y1; cur.w = Math.abs(w.x - cur._x0); cur.h = Math.abs(w.y - cur._y0); }
      else { cur.x2 = w.x; cur.y2 = w.y; if (e.shiftKey) { var dx = cur.x2 - cur.x, dy = cur.y2 - cur.y; if (Math.abs(dx) > Math.abs(dy)) cur.y2 = cur.y; else cur.x2 = cur.x; } }
      redraw();
    });
    function up(e) {
      delete ptrs[e.pointerId]; if (pinch) { if (Object.keys(ptrs).length < 2) pinch = null; return; }
      if (panning) { panning = null; root.style.cursor = tool === "hand" ? "grab" : "crosshair"; dirtyView(); return; }
      if (dragSel) { if (dragSel.mode === "move" && !dragSel.moved) undoS.pop(); if (dragSel.mode === "erase" || dragSel.moved || dragSel.mode === "scale") changed(); dragSel = null; redraw(); return; }
      if (!cur) return;
      var o = cur; cur = null;
      if (o.t === "r" || o.t === "e") { if (o.w < 3 && o.h < 3) { redraw(); return; } delete o._x0; delete o._y0; }
      push(); if (o.t === "s") o.p = o.p.map(function (q) { return [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]; });
      objs.push(o); redraw(); changed();
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    cv.addEventListener("wheel", function (e) { e.preventDefault(); var p = evPos(e); zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018))); }, { passive: false });
    cv.addEventListener("dblclick", function (e) {
      var p = evPos(e), w = toWorld(p.x, p.y), o = topAt(w.x, w.y, 4 / view.k);
      if (o && (o.t === "tx" || o.t === "n" || o.t === "tb")) { selId = o.id; ctxShow(); redraw(); editObj(o, false, w); }
    });
    function eraseAt(w) { var tol = Math.max(6, 10) / view.k, n = objs.length; objs = objs.filter(function (o) { return !hit(o, w.x, w.y, tol); }); if (objs.length !== n) { selId = null; redraw(); } }

    // ---------- text editing overlay ----------
    function editObj(o, isNew, wpt) {
      if (editor) commitEditor();
      var ta = el("textarea", "kzb-ed"); var target = { o: o, isNew: isNew, cell: null };
      var b = bounds(o), sx = b.x * view.k + view.x, sy = b.y * view.k + view.y, sw = Math.max(120, b.w * view.k), sh = Math.max(40, b.h * view.k), fs = 20 * view.k;
      if (o.t === "tb") { var pt = wpt || { x: b.x + 1, y: b.y + 1 }, cc = Math.min(o.cols - 1, Math.max(0, Math.floor((pt.x - o.x) / o.cw))), rw = Math.min(o.rows - 1, Math.max(0, Math.floor((pt.y - o.y) / o.ch))); target.cell = [rw, cc]; sx = (o.x + cc * o.cw) * view.k + view.x; sy = (o.y + rw * o.ch) * view.k + view.y; sw = o.cw * view.k; sh = o.ch * view.k; ta.value = o.cells[rw][cc] || ""; fs = Math.min(o.ch * .5, 22) * view.k; ta.style.textAlign = "center"; }
      else if (o.t === "tx") { ta.value = o.text || ""; fs = o.size * view.k; sw = Math.max(160, b.w * view.k + 30); }
      else { ta.value = o.text || ""; sw = o.w * view.k; sh = o.h * view.k; fs = 20 * view.k; ta.style.background = o.c; }
      ta.style.left = sx + "px"; ta.style.top = sy + "px"; ta.style.width = sw + "px"; ta.style.height = Math.max(sh, fs * 1.6) + "px"; ta.style.fontSize = fs + "px"; ta.dir = "auto";
      ta.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Escape") { commitEditor(); } else if (e.key === "Enter" && !e.shiftKey && (o.t === "tb")) { e.preventDefault(); commitEditor(); } else if (e.key === "Tab" && o.t === "tb") { e.preventDefault(); var cr = target.cell; commitEditor(); var nc = cr[1] + 1, nr = cr[0]; if (nc >= o.cols) { nc = 0; nr++; } if (nr < o.rows) editObj(o, false, { x: o.x + nc * o.cw + 2, y: o.y + nr * o.ch + 2 }); } });
      ta.addEventListener("blur", function () { setTimeout(function () { if (editor && editor.ta === ta) commitEditor(); }, 0); });
      root.appendChild(ta); editor = { ta: ta, target: target }; ta.focus(); ta.select();
    }
    function commitEditor() {
      if (!editor) return; var e = editor; editor = null; var o = e.target.o, v = e.ta.value; if (e.ta.parentNode) e.ta.parentNode.removeChild(e.ta);
      if (o.t === "tb") { var c = e.target.cell; if ((o.cells[c[0]][c[1]] || "") !== v) { push(); o.cells[c[0]][c[1]] = v; changed(); } }
      else if (o.t === "tx" && !v.trim()) { objs = objs.filter(function (x) { return x.id !== o.id; }); selId = null; ctxShow(); changed(); }
      else if ((o.text || "") !== v) { if (!e.target.isNew) push(); o.text = v; changed(); }
      redraw();
    }

    // ---------- keyboard ----------
    root.addEventListener("keydown", function (e) {
      if (editor) return;
      if (e.code === "Space") { space = true; e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (e.key === "Delete" || e.key === "Backspace") { if (selId) { e.preventDefault(); delSel(); } }
      else if (e.key === "Escape") { selId = null; ctxShow(); redraw(); }
    });
    root.addEventListener("keyup", function (e) { if (e.code === "Space") space = false; });

    // ---------- fit / export ----------
    function contentBounds() { if (!objs.length) return null; var x0 = 1e18, y0 = 1e18, x1 = -1e18, y1 = -1e18; objs.forEach(function (o) { var b = bounds(o); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
    function fitAll() { var b = contentBounds(); if (!b) { view = { x: W / 2, y: H / 2, k: 1 }; redraw(); return; } var k = Math.min(4, Math.min((W - 80) / Math.max(1, b.w), (H - 160) / Math.max(1, b.h))); view.k = k; view.x = (W - b.w * k) / 2 - b.x * k; view.y = (H - b.h * k) / 2 - b.y * k - 20; redraw(); dirtyView(); }
    function exportPng(whole) {
      var c2 = document.createElement("canvas"), x2 = c2.getContext("2d"), v, w, h;
      if (whole) { var b = contentBounds(); if (!b) { flash("السبورة فارغة"); return; } var pad = 40, s = Math.min(3, 4000 / Math.max(b.w + 2 * pad, b.h + 2 * pad)); w = Math.round((b.w + 2 * pad) * s); h = Math.round((b.h + 2 * pad) * s); v = { x: (pad - b.x) * s, y: (pad - b.y) * s, k: s }; }
      else { var f = 2; w = Math.round(W * f); h = Math.round(H * f); v = { x: view.x * f, y: view.y * f, k: view.k * f }; }
      c2.width = w; c2.height = h; drawScene(x2, v, w, h, !whole, bg); objs.forEach(function (o) { drawObj(x2, o); });
      c2.toBlob(function (bl) { var a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "kimza-board-" + lessonId + (whole ? "" : "-screen") + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); flash("تم حفظ الصورة"); }, "image/png");
    }

    // ---------- persistence ----------
    function fillBoards() { bSel.innerHTML = ""; boards.forEach(function (b) { var o = el("option"); o.value = b.id; o.textContent = b.name; bSel.appendChild(o); }); var n = el("option"); n.value = "__new"; n.textContent = "＋ سبورة جديدة"; bSel.appendChild(n); if (boardId) bSel.value = boardId; }
    async function init() {
      var r = await sb.from(TABLE).select("id,name").eq(COL, lessonId).order("id");
      if (r.error) { flash("تعذر تحميل السبورات: " + r.error.message); boards = []; }
      else boards = r.data || [];
      if (!boards.length) { var ins = await sb.from(TABLE).insert({ [COL]: lessonId, name: "سبورة 1", data: { objs: [], view: { x: 0, y: 0, k: 1 } } }).select("id,name"); if (ins.error) { flash("تعذر إنشاء سبورة: " + ins.error.message); } else boards = ins.data; }
      if (boards.length) await openBoard(boardId && boards.some(function (b) { return b.id === boardId; }) ? boardId : boards[0].id); else { fillBoards(); redraw(); }
    }
    async function openBoard(id) {
      if (dirty) await saveNow(false);
      var r = await sb.from(TABLE).select("id,name,data").eq("id", id).maybeSingle();
      if (!r.data) { flash("تعذر فتح السبورة"); return; }
      boardId = id; var d = r.data.data || {}; objs = d.objs || []; view = d.view || { x: W / 2, y: H / 2, k: 1 }; imgData = d.imgs || {}; imgEls = {}; setBg(d.bg || BGS[0][1], true); undoS = []; redoS = []; selId = null; ctxShow(); dirty = false; saveS.textContent = "";
      sb.from(TABLE).select("id,name").eq(COL, lessonId).order("id").then(function (rb) { boards = rb.data || boards; fillBoards(); }); redraw();
    }
    async function newBoard() { var n = prompt("اسم السبورة الجديدة:", "سبورة " + (boards.length + 1)); if (!n) { fillBoards(); return; } if (dirty) await saveNow(false); var ins = await sb.from(TABLE).insert({ [COL]: lessonId, name: n, data: { objs: [], view: { x: W / 2, y: H / 2, k: 1 } } }).select("id").single(); if (ins.error) { flash("تعذر الإنشاء: " + ins.error.message); fillBoards(); return; } boardId = ins.data.id; await openBoard(boardId); }
    async function saveNow(manual) {
      if (!boardId) return; clearTimeout(saveT); var used = {}; objs.forEach(function (o) { if (o.t === "img" && imgData[o.id]) used[o.id] = imgData[o.id]; }); var data = { objs: objs, view: view, bg: bg, imgs: used };
      var r = await sb.from(TABLE).update({ data: data, updated_at: new Date().toISOString() }).eq("id", boardId);
      if (r.error) { saveS.textContent = "⚠ لم يُحفظ"; flash("تعذر الحفظ: " + r.error.message); } else { dirty = false; saveS.textContent = "✓ محفوظ"; if (manual) flash("تم حفظ السبورة"); }
    }
    window.addEventListener("beforeunload", function () { if (dirty) saveNow(false); });

    // init
    setTool("pen"); setColor(COLORS[0]); resize(); view = { x: W / 2, y: H / 2, k: 1 };
    init();
    return {
      resize: resize, redraw: redraw, root: root,
      setFull: function (on) { root.classList.toggle("fsb", on); setTimeout(resize, 60); },
      flush: function () { return dirty ? saveNow(false) : null; }
    };
  }
  return { mount: mount };
})();
