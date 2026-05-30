// ui.js — helper UI bersama: navbar konsisten, export CSV, spinner, style baris.
// Dimuat setelah app.js, sebelum script per-halaman.

// mountNav menyuntik navbar konsisten ke elemen #app-nav.
// active: "im" | "aniq" | "maghib" | "admin" | null. me: objek user (opsional).
// Tiga metode ditampilkan setara sebagai entri navbar sejajar.
window.mountNav = function (active, me) {
  const root = document.getElementById("app-nav");
  if (!root) return;
  const link = (key, href, label) =>
    `<a href="${href}" class="btn btn-sm ${active === key ? "btn-active btn-ghost" : "btn-ghost"}">${label}</a>`;
  const methods =
    link("im", "hisab.html?method=im", "Irsyadul Murid") +
    link("aniq", "hisab.html?method=aniq", "Ad-Durr al-Anīq") +
    link("maghib", "maghib.html", "Maghīb al-Qamarain");
  const adminLink = me && me.role === "admin" ? link("admin", "admin.html", "Admin") : "";
  const greet = me ? `<span class="text-sm text-base-content/70 hidden sm:inline">👤 ${me.name}</span>` : "";
  root.outerHTML = `
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 flex-wrap">
    <div class="flex-1">
      <a href="index.html" class="btn btn-ghost text-lg gap-2">🌙 <span class="font-bold">Hisab DPUA</span></a>
    </div>
    <div class="flex-none gap-1 items-center flex-wrap justify-end">
      ${methods}
      ${adminLink}
      ${greet}
      <button onclick="logout()" class="btn btn-sm btn-ghost">Logout</button>
    </div>
  </div>`;
};

// downloadCSV: buat & unduh file CSV. headerRow=array string, dataRows=array of array.
// Pakai BOM UTF-8 agar °, ', dan teks Arab terbaca benar di Excel.
window.downloadCSV = function (filename, headerRow, dataRows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headerRow, ...dataRows].map((r) => r.map(esc).join(","));
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// setLoading: tampilkan spinner di tombol submit selama proses.
window.setLoading = function (btn, on) {
  if (!btn) return;
  if (on) {
    if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Menghitung…';
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
  }
};

// Style baris berwarna sesuai visibilitas hilal — RGBA tetap (lepas dari tema).
(function injectRowStyles() {
  const css = `
    tr.row-visible td { background: rgba(34,197,94,0.12); }
    tr.row-hidden  td { background: rgba(245,158,11,0.12); }
    tr.row-visible:hover td { background: rgba(34,197,94,0.20); }
    tr.row-hidden:hover  td { background: rgba(245,158,11,0.20); }
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
})();
