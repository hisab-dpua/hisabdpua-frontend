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
  theme: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>',
};

// mountNav menyuntik navbar konsisten & RESPONSIF ke elemen #app-nav.
// active: "im" | "aniq" | "maghib" | "alfalak" | "alfalak-map" | "admin" | null.
// me: objek user (opsional). Di layar lebar menu tampil sejajar; di mobile
// menu masuk ke dropdown hamburger agar tidak meluap.
window.mountNav = function (active, me) {
  const root = document.getElementById("app-nav");
  if (!root) return;

  const items = [
    ["im", "hisab.html?method=im", "Irsyadul Murid"],
    ["aniq", "hisab.html?method=aniq", "Ad-Durr al-Anīq"],
    ["maghib", "maghib.html", "Maghīb al-Qamarain"],
    ["alfalak", "alfalak-hilal.html", "Al Falak DPUA"],
    ["alfalak-map", "alfalak-map.html", "Peta Hilal"],
  ];
  if (me && me.role === "admin") items.push(["admin", "admin.html", "Admin"]);

  // Menu inline (desktop): tombol-tombol sejajar.
  const inline = items.map(([key, href, label]) =>
    `<a href="${href}" class="btn btn-sm ${active === key ? "btn-active btn-ghost" : "btn-ghost"}">${label}</a>`
  ).join("");
  // Menu dropdown (mobile): daftar <li>.
  const dropdownItems = items.map(([key, href, label]) =>
    `<li><a href="${href}" class="${active === key ? "active" : ""}">${label}</a></li>`
  ).join("");

  const themeBtn = `<button onclick="toggleTheme()" class="btn btn-sm btn-ghost btn-circle" title="Mode terang/gelap" aria-label="Ganti tema">${window.icons.theme}</button>`;
  const authArea = me
    ? `<span class="text-sm text-base-content/70 hidden md:inline-flex items-center gap-1">${window.icons.user}${me.name}</span>
       <button onclick="logout()" class="btn btn-sm btn-ghost">Logout</button>`
    : `<a href="login.html" class="btn btn-sm btn-ghost">Masuk</a>
       <a href="register.html" class="btn btn-sm btn-primary">Daftar</a>`;

  root.outerHTML = `
  <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-2 sm:px-4">
    <div class="navbar-start">
      <!-- Hamburger (mobile saja) -->
      <div class="dropdown lg:hidden">
        <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-circle" aria-label="Menu">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </div>
        <ul tabindex="0" class="menu menu-sm dropdown-content mt-2 z-[60] p-2 shadow-lg bg-base-100 rounded-box w-60 gap-0.5">
          ${dropdownItems}
        </ul>
      </div>
      <a href="index.html" class="btn btn-ghost normal-case text-base sm:text-lg gap-2 px-1 sm:px-2">
        <img src="assets/logo-alfalak.png" alt="Al Falak DPUA" class="w-7 h-7 sm:w-8 sm:h-8 rounded">
        <span class="font-bold">Al Falak DPUA</span>
      </a>
    </div>
    <!-- Menu inline hanya di layar lebar -->
    <div class="navbar-center hidden lg:flex">
      <div class="flex items-center gap-1">${inline}</div>
    </div>
    <div class="navbar-end gap-1 items-center">
      ${themeBtn}
      ${authArea}
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

// ─────────── Latar bintang berkelip (port dari desktop) ───────────
// Membuat #star-field bila belum ada, lalu menaburkan N titik dengan posisi,
// ukuran, durasi, dan opacity acak. CSS (.star/.twinkle) di theme.css.
// Hormati prefers-reduced-motion (titik statis, tanpa animasi).
window.initStarField = function (count = 70) {
  const make = () => {
    let host = document.getElementById("star-field");
    if (!host) {
      host = document.createElement("div");
      host.id = "star-field";
      host.className = "star-field";
      host.setAttribute("aria-hidden", "true");
      document.body.insertBefore(host, document.body.firstChild);
    }
    if (host.childElementCount) return; // sudah diisi
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("div");
      s.className = "star";
      const size = (Math.random() * 2 + 0.6).toFixed(2);
      s.style.width = size + "px";
      s.style.height = size + "px";
      s.style.left = (Math.random() * 100).toFixed(2) + "%";
      s.style.top = (Math.random() * 100).toFixed(2) + "%";
      s.style.setProperty("--duration", (Math.random() * 4 + 3).toFixed(1) + "s");
      s.style.setProperty("--opacity", (Math.random() * 0.6 + 0.3).toFixed(2));
      if (reduce) s.style.animation = "none";
      s.style.animationDelay = (Math.random() * 5).toFixed(1) + "s";
      frag.appendChild(s);
    }
    host.appendChild(frag);
  };
  if (document.body) make();
  else document.addEventListener("DOMContentLoaded", make);
};

// Aktifkan otomatis di setiap halaman yang memuat ui.js.
window.initStarField();

// ───────────────────────── Toast notifikasi ─────────────────────────
// toast(msg, kind) — kind: "success" | "error" | "warning" | "info".
// Muncul di kanan-bawah, auto-hilang. Pengganti alert() yang lebih halus.
(function injectToastHost() {
  if (document.getElementById("toast-host")) return;
  const host = document.createElement("div");
  host.id = "toast-host";
  host.className = "toast toast-end toast-bottom z-50";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(host));
  // jika DOM sudah siap saat skrip dimuat:
  if (document.body) document.body.appendChild(host);
})();

window.toast = function (msg, kind = "info", ms = 3200) {
  let host = document.getElementById("toast-host");
  if (!host) { host = document.createElement("div"); host.id = "toast-host"; host.className = "toast toast-end toast-bottom z-50"; document.body.appendChild(host); }
  const cls = { success: "alert-success", error: "alert-error", warning: "alert-warning", info: "alert-info" }[kind] || "alert-info";
  const ic = { success: window.icons.check, error: window.icons.x, warning: "", info: "" }[kind] || "";
  const el = document.createElement("div");
  el.className = `alert ${cls} shadow-lg text-sm py-2 px-3`;
  el.setAttribute("role", "status");
  el.innerHTML = `${ic}<span>${msg}</span>`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, ms);
};

// ───────────────────────── Modal konfirmasi ─────────────────────────
// confirmDialog({title, body, confirmLabel, danger}) → Promise<boolean>.
// Pengganti window.confirm() — bertema, dapat menandai aksi destruktif.
window.confirmDialog = function (opts = {}) {
  const { title = "Konfirmasi", body = "Lanjutkan?", confirmLabel = "Ya", cancelLabel = "Batal", danger = false } = opts;
  return new Promise((resolve) => {
    const dlg = document.createElement("dialog");
    dlg.className = "modal";
    dlg.innerHTML = `
      <div class="modal-box">
        <h3 class="font-bold text-lg">${title}</h3>
        <p class="py-3 text-sm">${body}</p>
        <div class="modal-action">
          <button class="btn btn-sm" data-act="cancel">${cancelLabel}</button>
          <button class="btn btn-sm ${danger ? "btn-error" : "btn-primary"}" data-act="ok">${confirmLabel}</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button data-act="cancel">close</button></form>`;
    document.body.appendChild(dlg);
    const done = (val) => { dlg.close(); dlg.remove(); resolve(val); };
    dlg.querySelector('[data-act="ok"]').addEventListener("click", () => done(true));
    dlg.querySelectorAll('[data-act="cancel"]').forEach((b) => b.addEventListener("click", () => done(false)));
    dlg.addEventListener("cancel", () => done(false));
    dlg.showModal();
  });
};

// ───────────────────────── Salin ke clipboard ─────────────────────────
window.copyToClipboard = async function (text, okMsg = "Disalin ke papan klip") {
  try {
    await navigator.clipboard.writeText(text);
    window.toast(okMsg, "success");
  } catch (_) {
    // fallback untuk konteks non-secure
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); window.toast(okMsg, "success"); }
    catch (e) { window.toast("Gagal menyalin", "error"); }
    ta.remove();
  }
};

// ───────────────────── Cetak/PDF area tertentu ─────────────────────
// printArea(html, title) — buka jendela cetak berisi `html`, mewarisi
// daisyUI/Tailwind via CDN agar tabel rapi; pengguna pilih "Save as PDF".
window.printArea = function (innerHTML, title = "Cetak") {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { window.toast("Popup diblokir browser", "error"); return; }
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @media print { @page { margin: 14mm; } .no-print { display:none !important; } }
      body { font-family: ui-sans-serif, system-ui, sans-serif; color:#1f2937; }
      table { width:100%; border-collapse: collapse; font-size: 11px; }
      th, td { border:1px solid #d1d5db; padding:3px 6px; }
      thead th { background:#f3f4f6; }
      h1,h2 { margin: 0 0 6px; }
    </style></head><body class="p-2">
    ${innerHTML}
    <div class="no-print mt-6 text-center">
      <button onclick="window.print()" style="padding:8px 16px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;cursor:pointer">Cetak / Simpan PDF</button>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script>
    </body></html>`);
  w.document.close();
};

// ───────────────── Penyimpanan lokal: riwayat & favorit ─────────────────
// store(key) → objek {all, add, remove, clear} untuk daftar di localStorage.
window.lsList = function (key, max = 50) {
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch (_) { return []; } };
  const write = (arr) => { try { localStorage.setItem(key, JSON.stringify(arr.slice(0, max))); } catch (_) {} };
  return {
    all: read,
    add(item, dedupeKey) {
      let arr = read();
      if (dedupeKey) arr = arr.filter((x) => x[dedupeKey] !== item[dedupeKey]);
      arr.unshift(item);
      write(arr);
      return arr;
    },
    removeAt(i) { const arr = read(); arr.splice(i, 1); write(arr); return arr; },
    remove(pred) { const arr = read().filter((x) => !pred(x)); write(arr); return arr; },
    clear() { write([]); },
  };
};

// ───────────────────────── Geolokasi browser ─────────────────────────
// getGeolocation() → Promise<{lat, lon}>; reject bila ditolak/tak didukung.
window.getGeolocation = function () {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Browser tak mendukung geolokasi"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// debounce util kecil untuk input pencarian.
window.debounce = function (fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};
