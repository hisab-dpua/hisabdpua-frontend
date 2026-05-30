// ui.js — helper UI bersama: navbar konsisten, export CSV, spinner, style baris.
// Dimuat setelah app.js, sebelum script per-halaman.

// Ikon SVG (Heroicons, MIT) — pengganti emoji agar tampilan profesional.
// stroke=currentColor → ikut warna teks; tanpa dependensi/CDN.
window.icons = {
  moon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 inline-block align-text-bottom"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 inline-block align-text-bottom"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>',
  download: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 inline-block align-text-bottom"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 inline-block align-text-bottom"><path d="m4.5 12.75 6 6 9-13.5"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4 inline-block align-text-bottom"><path d="M6 18 18 6M6 6l12 12"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5 inline-block align-text-bottom text-warning"><path d="M11.48 3.5a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>',
};

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
  const greet = me ? `<span class="text-sm text-base-content/70 hidden sm:inline-flex items-center gap-1">${window.icons.user}${me.name}</span>` : "";
  root.outerHTML = `
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 flex-wrap">
    <div class="flex-1">
      <a href="index.html" class="btn btn-ghost text-lg gap-2">${window.icons.moon}<span class="font-bold">Hisab DPUA</span></a>
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
