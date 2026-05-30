// config.js — runtime config untuk frontend statis.
// Backend URL di-detect dari hostname: localhost → dev backend, lainnya → prod.
// Edit production URL di sini setelah deploy backend ke GCF.

(function () {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "") {
    window.API_BASE = "http://localhost:8080";
  } else {
    // GANTI setelah deploy backend ke GCF / Cloud Run.
    window.API_BASE = "https://hisabdpua-gocroot-jbovqbupqa-et.a.run.app";
  }
})();
