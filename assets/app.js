// app.js — fetch wrapper untuk arsitektur GH-Pages + GCF terpisah.
//
// Auth: token PASETO disimpan di localStorage("hisab_token") + dikirim sebagai
// header Authorization: Bearer (lebih aman dari cookie cross-origin).

const TOKEN_KEY = "hisab_token";

window.getToken = () => localStorage.getItem(TOKEN_KEY) || "";
window.setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
window.clearToken = () => localStorage.removeItem(TOKEN_KEY);

window.apiURL = (path) => (window.API_BASE || "") + path;

window.fetchAPI = async function (path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const tok = getToken();
  if (tok) headers["Authorization"] = "Bearer " + tok;
  opts.headers = headers;
  opts.credentials = "include";

  const res = await fetch(apiURL(path), opts);

  if (res.status === 401 && !path.startsWith("/login") && !path.startsWith("/register")) {
    clearToken();
    window.location.href = "login.html";
    throw new Error("unauthorized");
  }
  if (res.status === 403) {
    try {
      const data = await res.clone().json();
      if (data.redirect) {
        const map = {
          "/pending-approval": "pending-approval.html",
          "/login": "login.html",
        };
        window.location.href = map[data.redirect] || "pending-approval.html";
        throw new Error(data.error || "forbidden");
      }
    } catch (_) { /* caller handle */ }
  }
  return res;
};

// fetchMe: cek user yang sedang login TANPA efek samping redirect — untuk
// navbar di HALAMAN PUBLIK (beranda, hilal, peta, dll). Kembalikan objek user
// bila login & valid, atau null bila belum login / token kedaluwarsa.
// Tanpa token tidak ada request (langsung null) agar tak memicu 401.
window.fetchMe = async function () {
  const tok = getToken();
  if (!tok) return null;
  try {
    const res = await fetch(apiURL("/me"), {
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
      credentials: "include",
    });
    if (!res.ok) {
      if (res.status === 401) clearToken(); // token basi → bersihkan, tapi JANGAN redirect
      return null;
    }
    return await res.json();
  } catch (_) {
    return null;
  }
};

window.logout = async function () {
  try {
    await fetchAPI("/logout", { method: "POST" });
  } catch {}
  clearToken();
  window.location.href = "index.html";
};

// requireAuthPage: dipanggil di awal halaman protected. Redirect ke login.html
// kalau token tak ada / not ok, atau ke pending-approval.html kalau status pending.
// Return object user kalau lulus.
window.requireAuthPage = async function () {
  if (!getToken()) {
    window.location.href = "login.html";
    return null;
  }
  try {
    const res = await fetchAPI("/me");
    if (!res.ok) {
      window.location.href = "login.html";
      return null;
    }
    const me = await res.json();
    if (me.role !== "admin" && me.approval_status !== "approved") {
      window.location.href = "pending-approval.html";
      return null;
    }
    return me;
  } catch {
    window.location.href = "login.html";
    return null;
  }
};
