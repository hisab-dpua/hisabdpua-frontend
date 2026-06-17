// index.js — pasang navbar bersama di beranda (publik; auth opsional).
(async function () {
  try {
    const res = await fetchAPI("/me");
    mountNav(null, res.ok ? await res.json() : null);
  } catch (_) {
    mountNav(null, null);
  }
})();
