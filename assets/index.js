// index.js — pasang navbar bersama di beranda (publik; auth opsional).
// Pakai fetchMe() (tanpa efek redirect) agar pengunjung yang belum login
// TIDAK dilempar ke halaman login.
(async function () {
  mountNav(null, await fetchMe());
})();
