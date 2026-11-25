// KIMZA Academy site settings. Change values here (no code changes needed elsewhere).
window.KIMZA_SITE = {
  // Email alert when someone finishes the placement test: paste the Apps Script web app URL here (see Claude outputs/placement-email.gs)
  notifyUrl: "https://script.google.com/macros/s/AKfycbxXC480Oc_pkCwbq-v0iIINOnrZFVAtW59i8j0CNSFE2eZM7dE5PA3XrD3ST5u7D8gY/exec",
  notifyToken: "kimza-pt-2026",
  instagramHandle: "kimza_academy",
  instagramUrl: "https://www.instagram.com/kimza_academy/",
  sessionsPerWeek: 4,
  sessionMinutes: 90,
  // Placement test scoring (configurable, not final).
  // A level counts as "passed" when the student gets at least passMark of that level's questions right.
  // The recommended level is the first level that is NOT passed (the level to study), or C1 if all are passed.
  placement: { passMark: 0.66, order: ["A1", "A2", "B1", "B2", "C1"] }
};
