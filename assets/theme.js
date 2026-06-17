// theme.js — terapkan tema tersimpan sedini mungkin (cegah "flash" warna lama).
// Warna tema didefinisikan di theme.css (override variabel daisyUI OKLCH).
// Tema: "alfalak" (terang) / "alfalak-dark" (langit malam) — meniru desktop.
(function () {
  try {
    const saved = localStorage.getItem("alfalak-theme") || "alfalak";
    document.documentElement.setAttribute("data-theme", saved);
  } catch (_) {
    document.documentElement.setAttribute("data-theme", "alfalak");
  }
})();

// Helper global untuk toggle tema (dipakai tombol di navbar).
window.toggleTheme = function () {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "alfalak-dark" ? "alfalak" : "alfalak-dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("alfalak-theme", next); } catch (_) {}
  window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
};
