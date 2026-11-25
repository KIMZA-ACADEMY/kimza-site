/* KIMZA portal: English / Arabic switch, dark / light switch. Loaded after app.js. */
(function () {
  var root = document.documentElement;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var DICT = {
    "الرئيسية": "Home", "المراجعة": "Review", "البطاقات": "Cards", "الحضور": "Attendance", "المحادثة": "Speaking", "الشهادات": "Certificates", "خروج": "Log out", "لوحة المعلم": "Teacher panel",
    "نشط": "Active", "متوقف مؤقتاً": "Paused", "خريج": "Graduate", "موقوف": "Stopped",
    "الدروس": "Lessons", "الاختبارات الأسبوعية": "Weekly tests", "الامتحانات الشهرية": "Monthly exams", "امتحان نهاية المستوى": "Level final exam",
    "تقدّمك نحو هدفك": "Your progress toward your goal", "المستوى": "Level", "الواجبات": "Homework", "الكلمات": "Words", "الاختبارات": "Tests",
    "مهامك اليوم": "Today's tasks", "مراجعة البطاقات": "Card review", "ابدأ": "Start", "افتح": "Open", "لم يُسلَّم بعد": "Not submitted yet",
    "🎉 لا مهام متبقية اليوم. أحسنت!": "🎉 No tasks left today. Well done!",
    "دروسك": "Your lessons", "القصة": "Story", "الصوت": "Audio", "التمارين": "Exercises", "الواجب": "Homework", "القصة والصوت": "Story and audio",
    "🔒 سيُفتح قريباً": "🔒 Opens soon", "سيُفتح قريباً": "Opens soon",
    "لم يفتح المعلم دروساً بعد. دروس مستواك ظاهرة أدناه وستُفتح تباعاً.": "The teacher has not opened any lessons yet. Your level's lessons are listed below and will open one by one.",
    "لا يوجد اختبار متاح الآن.": "No test is available right now.",
    "اختبار أسبوعي": "Weekly test", "امتحان شهري": "Monthly exam", "قيد التنفيذ": "In progress", "متاح": "Available", "تابع": "Continue", "مغلق": "Closed",
    "إعلانات": "Announcements", "حصصك المباشرة": "Your live sessions", "رابط الحصة": "Session link", "مجتمع المستوى": "Level community",
    "بطاقات AnkiDroid": "AnkiDroid cards", "🔒 ستُفتح الحزمة عندما يقرر المعلم ذلك.": "🔒 The deck will open when the teacher decides.",
    "حفظ كلمة المرور": "Save password", "غيّر كلمة المرور المؤقتة الآن": "Change your temporary password now",
    "حسابك ليس نشطاً حالياً، لذلك قد لا تظهر بعض المواد. تواصل مع المعلم.": "Your account is not active at the moment, so some material may be hidden. Contact the teacher.",
    "مراجعة البطاقات ": "Card review", "سرعة الصوت": "Audio speed", "اعرض الإجابة": "Show answer", "مرة أخرى": "Again", "صعبة": "Hard", "جيدة": "Good", "سهلة": "Easy",
    "🔊 استمع": "🔊 Listen", "🔊 استمع للمثال": "🔊 Listen to the example", "🔁 كرّر الكلمة": "🔁 Repeat the word", "🔁 كرّر المثال": "🔁 Repeat the example", "⏹ أوقف التكرار": "⏹ Stop repeating",
    "أحسنت! أنهيت مراجعة اليوم": "Well done! You finished today's review", "لا توجد بطاقات مستحقة الآن": "No cards are due now", "العودة للرئيسية": "Back to home", "العودة": "Back", "← العودة": "← Back",
    "جارٍ تحميل الكلمات...": "Loading words...", "جارٍ تحميل الصوت...": "Loading audio...", "السرعة": "Speed", "🔁 تكرار تلقائي": "🔁 Auto repeat", "⏹ إيقاف التكرار": "⏹ Stop repeating", "⬇ تحميل الصوت": "⬇ Download audio",
    "🔁 كرّر الصوت الذي أضغط عليه حتى أضغط عليه مرة أخرى": "🔁 Keep repeating the sound I click until I click it again",
    "🎧 استمع إلى القصة": "🎧 Listen to the story",
    "استمع ثم أعد القصة جملة جملة. غيّر السرعة وفعّل التكرار ليعيد الصوت دون أن تضغط كل مرة.": "Listen, then retell the story sentence by sentence. Change the speed and turn on repeat so the audio repeats without clicking each time.",
    "لم يرفع المعلم ملف الصوت لهذا الدرس بعد.": "The teacher has not uploaded this lesson's audio yet.",
    "تمارين الحصة التفاعلية لهذا الدرس.": "This lesson's interactive class exercises.",
    "⛶ ملء الشاشة": "⛶ Full screen", "✕ إغلاق": "✕ Close",
    "هل أنت جاهز للواجب؟": "Are you ready for the homework?", "هل أنت جاهز؟": "Are you ready?",
    "سيبدأ الواجب الآن، ومدته": "The homework starts now and lasts", "سيبدأ": "Starts", "الآن ومدته": "now and lasts",
    "يبدأ العدّاد فور الضغط على «نعم، ابدأ»": "The timer starts as soon as you press “Yes, start”", "ولا يتوقف": "and never stops",
    "حتى لو خرجت من الصفحة. درجتك الأولى هي التي تُحتسب.": "even if you leave the page. Your first score is the one that counts.",
    "حتى لو خرجت من الصفحة، ولا يمكن إعادة الاختبار.": "even if you leave the page, and the test cannot be retaken.",
    "نعم، ابدأ الواجب": "Yes, start the homework", "نعم، ابدأ الاختبار": "Yes, start the test", "ليس بعد": "Not yet",
    "الواجب جاهز": "The homework is ready", "اضغط عندما تكون مستعداً. لن يبدأ العدّاد قبل ذلك.": "Press when you are ready. The timer will not start before that.", "ابدأ الواجب": "Start the homework",
    "تسليم الواجب": "Submit the homework", "تسليم الاختبار": "Submit the test",
    "بعد التسليم": "After submitting", "لا يمكنك الحصول على درجة أفضل": "you cannot get a better score", "لا يمكنك الحصول على درجة أفضل، فدرجتك الأولى هي التي تُحتسب.": "you cannot get a better score; your first score is the one that counts.",
    "راجع إجاباتك جيداً، فلا يزال لديك وقت.": "Review your answers carefully, you still have time.", "سلّم الآن": "Submit now", "أراجع إجاباتي": "Let me review my answers",
    "ابدأ الاختبار": "Start the test", "النتيجة": "Result", "تم تسليم الاختبار.": "The test has been submitted.", "الاختبار مغلق": "The test is closed",
    "العدّاد يبدأ عند الضغط على «ابدأ» ولا يتوقف.": "The timer starts when you press “Start” and does not stop.",
    "يُسلَّم الاختبار تلقائياً عند انتهاء الوقت.": "The test is submitted automatically when time runs out.", "لا يمكن إعادة الاختبار.": "The test cannot be retaken.", "النسخ والطباعة محظوران على هذه الصفحة.": "Copying and printing are blocked on this page.",
    "هذه الميزة متوقفة مؤقتاً": "This feature is temporarily unavailable", "سيعيد المعلم تشغيلها قريباً.": "The teacher will turn it back on soon.",
    "تسجيل الدخول": "Log in", "اسم المستخدم": "Username", "كلمة المرور": "Password", "دخول": "Log in",
    "بطاقات المفردات": "Vocabulary cards", "السابقة": "Previous", "التالية": "Next", "عرفتها ✓": "I knew it ✓"
  };
  var PATTERNS = [
    [/^مرحباً (.+)$/, "Welcome, $1"], [/^المستوى ([A-C]\d)$/, "Level $1"],
    [/^(\d+) من (\d+) درساً$/, "$1 of $2 lessons"], [/^(\d+) من (\d+) كلمة$/, "$1 of $2 words"], [/^(\d+) من (\d+)$/, "$1 of $2"],
    [/^(\d+) للمراجعة · (\d+) جديدة اليوم$/, "$1 to review · $2 new today"],
    [/^واجب الدرس (\d+)$/, "Lesson $1 homework"], [/^مفتوح الآن · (\d+) دقيقة$/, "Open now · $1 min"],
    [/^الأسبوع (\d+)$/, "Week $1"], [/^الدرس (\d+)$/, "Lesson $1"], [/^الواجب (\d+)\/(\d+)$/, "Homework $1/$2"],
    [/^(\d+) دقيقة$/, "$1 min"], [/^النتيجة (\d+) \/ (\d+)$/, "Result $1 / $2"], [/^النتيجة: (\d+) من (\d+)$/, "Result: $1 of $2"],
    [/^جديد (\d+)$/, "New $1"], [/^تعلّم (\d+)$/, "Learning $1"], [/^مراجعة (\d+)$/, "Review $1"],
    [/^راجعت (\d+) بطاقة\.$/, "You reviewed $1 cards."], [/^(\d+) د$/, "$1 m"], [/^(\d+) س$/, "$1 h"], [/^(\d+) ي$/, "$1 d"],
    [/^تحميل الحزمة \((.+)\)$/, "Download the deck ($1)"], [/^(\d+) دقيقة\.$/, "$1 minutes."], [/^المدة: (\d+) دقيقة/, "Duration: $1 minutes"]
  ];
  var origText = new WeakMap(), origAttr = new WeakMap();
  function tr(s) {
    var t = s.trim(); if (!t) return null;
    if (DICT[t]) return DICT[t];
    for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i][0].test(t)) return t.replace(PATTERNS[i][0], PATTERNS[i][1]);
    return null;
  }
  function walk(node, toEn) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (toEn) {
        var r = tr(node.nodeValue);
        if (r !== null) { if (!origText.has(node)) origText.set(node, node.nodeValue); var lead = node.nodeValue.match(/^\s*/)[0], trail = node.nodeValue.match(/\s*$/)[0]; node.nodeValue = lead + r + trail; }
      } else if (origText.has(node)) { node.nodeValue = origText.get(node); origText.delete(node); }
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|IFRAME|PRE|AUDIO)$/.test(node.tagName)) return;
    ["placeholder", "aria-label", "title"].forEach(function (a) {
      if (node.hasAttribute && node.hasAttribute(a)) {
        var v = node.getAttribute(a);
        if (toEn) { var r2 = tr(v); if (r2 !== null) { if (!origAttr.has(node)) origAttr.set(node, {}); origAttr.get(node)[a] = v; node.setAttribute(a, r2); } }
        else if (origAttr.has(node) && origAttr.get(node)[a] !== undefined) { node.setAttribute(a, origAttr.get(node)[a]); }
      }
    });
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c, toEn);
  }
  var obs = null, busy = false;
  function apply(lang) {
    root.setAttribute("lang", lang); root.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
    if (obs) { obs.disconnect(); obs = null; }
    busy = true; walk(document.body, lang === "en"); busy = false;
    var lb = document.getElementById("pLang"); if (lb) lb.textContent = lang === "en" ? "العربية" : "English";
    if (lang === "en") {
      obs = new MutationObserver(function (muts) {
        if (busy) return; busy = true;
        muts.forEach(function (m) { m.addedNodes.forEach(function (n) { walk(n, true); }); if (m.type === "characterData") walk(m.target, true); });
        busy = false;
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }
  function applyTheme(t) { root.setAttribute("data-theme", t); var b = document.getElementById("pTheme"); if (b) b.textContent = t === "dark" ? "☀" : "☾"; }

  // buttons are added to the header by app.js (shell) through this hook
  window.KZ_PORTAL = {
    mount: function () {
      var nav = document.querySelector("#appHeader nav.links"); if (!nav || document.getElementById("pTheme")) return;
      var who = nav.querySelector(".who");
      var l = document.createElement("button"); l.id = "pLang"; l.type = "button"; l.className = "btn btn-ghost sm"; l.style.color = "var(--cream)"; l.setAttribute("aria-label", "Language");
      var t = document.createElement("button"); t.id = "pTheme"; t.type = "button"; t.className = "btn btn-ghost sm"; t.style.color = "var(--cream)"; t.setAttribute("aria-label", "Theme");
      nav.insertBefore(l, who || nav.firstChild); nav.insertBefore(t, who || nav.firstChild);
      l.addEventListener("click", function () { var n = (get("kimza-lang") === "en") ? "ar" : "en"; set("kimza-lang", n); apply(n); });
      t.addEventListener("click", function () { var n = root.getAttribute("data-theme") === "dark" ? "light" : "dark"; set("kimza-theme", n); applyTheme(n); });
      applyTheme(root.getAttribute("data-theme") || "light"); apply(get("kimza-lang") === "en" ? "en" : "ar");
    },
    refresh: function () { if (get("kimza-lang") === "en") apply("en"); }
  };
})();
