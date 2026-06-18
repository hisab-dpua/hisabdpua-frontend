// admin.js — panel admin: dashboard, kelola user & kota (cari/filter/sort,
// approve/revoke massal, impor/ekspor CSV). Pakai toast/confirmDialog dari ui.js.

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Gate: hanya admin.
  let me;
  try {
    const meRes = await fetchAPI("/me");
    if (!meRes.ok) { window.location.href = "login.html"; return; }
    me = await meRes.json();
    mountNav("admin", me);
    if (me.role !== "admin") { $("#forbidden").classList.remove("hidden"); return; }
    $("#admin-content").classList.remove("hidden");
  } catch { window.location.href = "login.html"; return; }

  // State penuh (di-cache di klien untuk cari/sort tanpa round-trip).
  let allUsers = [];
  let allCities = [];
  let userSort = { key: "created_at", dir: -1 };
  let citySort = { key: "order", dir: 1 };

  const fmtDate = (s) => s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  // ───────────────────────── Tab ─────────────────────────
  $("#tab-users").addEventListener("click", () => switchTab("users"));
  $("#tab-cities").addEventListener("click", () => switchTab("cities"));
  function switchTab(which) {
    $("#tab-users").classList.toggle("tab-active", which === "users");
    $("#tab-cities").classList.toggle("tab-active", which === "cities");
    $("#panel-users").classList.toggle("hidden", which !== "users");
    $("#panel-cities").classList.toggle("hidden", which !== "cities");
  }

  await Promise.all([loadUsers(), loadCities()]);

  // ═══════════════════════ DASHBOARD ═══════════════════════
  function renderDashboard() {
    const admins = allUsers.filter((u) => u.role === "admin").length;
    const pending = allUsers.filter((u) => u.role !== "admin" && u.approval_status !== "approved").length;
    const defCities = allCities.filter((c) => c.is_default).length;
    $("#stat-users").textContent = allUsers.length;
    $("#stat-admins").textContent = `${admins} admin`;
    $("#stat-pending").textContent = pending;
    $("#stat-cities").textContent = allCities.length;
    $("#stat-default-cities").textContent = `${defCities} default`;
    const last = [...allUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (last) {
      $("#stat-last-reg").textContent = new Date(last.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      $("#stat-last-name").textContent = last.name;
    }
  }

  // ═══════════════════════ USERS ═══════════════════════
  async function loadUsers() {
    const res = await fetchAPI("/api/admin/users");
    const data = await res.json();
    allUsers = data.users || [];
    renderDashboard();
    renderPending();
    renderUsers();
  }

  function renderPending() {
    const pending = allUsers.filter((u) => u.role !== "admin" && u.approval_status !== "approved");
    $("#pending-count").textContent = pending.length;
    $("#approve-all").classList.toggle("hidden", pending.length === 0);
    const tbody = $("#pending-body"), table = $("#pending-table"), empty = $("#pending-empty");
    if (pending.length === 0) { table.classList.add("hidden"); empty.classList.remove("hidden"); return; }
    table.classList.remove("hidden"); empty.classList.add("hidden");
    tbody.innerHTML = pending.map((u) => `
      <tr data-id="${u.id}">
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td class="text-xs">${fmtDate(u.created_at)}</td>
        <td class="text-right"><button class="btn btn-success btn-xs" data-action="approve">Approve</button></td>
      </tr>`).join("");
    tbody.querySelectorAll("button[data-action]").forEach((b) => b.addEventListener("click", onUserAction));
  }

  function renderUsers() {
    const q = ($("#user-search").value || "").toLowerCase().trim();
    const f = $("#user-filter").value;
    let list = allUsers.filter((u) => {
      if (q && !(`${u.name} ${u.email}`.toLowerCase().includes(q))) return false;
      if (f === "admin") return u.role === "admin";
      if (f === "approved") return u.approval_status === "approved";
      if (f === "pending") return u.role !== "admin" && u.approval_status !== "approved";
      return true;
    });
    list.sort((a, b) => {
      const k = userSort.key;
      let va = a[k] ?? "", vb = b[k] ?? "";
      if (k === "created_at") { va = new Date(va); vb = new Date(vb); }
      return (va < vb ? -1 : va > vb ? 1 : 0) * userSort.dir;
    });
    $("#users-count").textContent = list.length;
    $("#users-empty").classList.toggle("hidden", list.length > 0);
    const tbody = $("#users-body");
    tbody.innerHTML = list.map((u) => {
      const statusBadge = u.approval_status === "approved"
        ? '<span class="badge badge-success badge-sm">approved</span>'
        : '<span class="badge badge-warning badge-sm">pending</span>';
      const roleBadge = u.role === "admin"
        ? '<span class="badge badge-info badge-sm">admin</span>'
        : '<span class="badge badge-ghost badge-sm">user</span>';
      const actionBtn = u.role === "admin"
        ? '<span class="text-xs text-base-content/50">—</span>'
        : (u.approval_status === "approved"
          ? '<button class="btn btn-warning btn-xs" data-action="revoke">Revoke</button>'
          : '<button class="btn btn-success btn-xs" data-action="approve">Approve</button>');
      return `<tr data-id="${u.id}">
        <td>${escapeHTML(u.name)}</td><td>${escapeHTML(u.email)}</td>
        <td>${roleBadge}</td><td>${statusBadge}</td>
        <td class="text-xs">${fmtDate(u.created_at)}</td>
        <td class="text-right">${actionBtn}</td></tr>`;
    }).join("");
    tbody.querySelectorAll("button[data-action]").forEach((b) => b.addEventListener("click", onUserAction));
  }

  $("#user-search").addEventListener("input", window.debounce(renderUsers, 200));
  $("#user-filter").addEventListener("change", renderUsers);
  $$('#panel-users th[data-sort]').forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.sort;
    userSort = { key: k, dir: userSort.key === k ? -userSort.dir : 1 };
    renderUsers();
  }));

  async function onUserAction(ev) {
    const action = ev.target.dataset.action; // approve | revoke
    const id = ev.target.closest("tr").dataset.id;
    const u = allUsers.find((x) => x.id === id);
    if (action === "revoke") {
      const ok = await confirmDialog({ title: "Cabut akses?", body: `Revoke approval untuk <b>${escapeHTML(u?.name || "user")}</b>?`, confirmLabel: "Revoke", danger: true });
      if (!ok) return;
    }
    ev.target.disabled = true;
    try {
      const res = await fetchAPI(`/api/admin/users/${id}/${action}`, { method: "POST" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast(`Gagal: ${e.error || res.status}`, "error"); ev.target.disabled = false; return; }
      toast(action === "approve" ? "User di-approve" : "Approval dicabut", "success");
      await loadUsers();
    } catch (err) { toast(`Error: ${err.message}`, "error"); ev.target.disabled = false; }
  }

  $("#approve-all").addEventListener("click", async () => {
    const pending = allUsers.filter((u) => u.role !== "admin" && u.approval_status !== "approved");
    const ok = await confirmDialog({ title: "Approve semua?", body: `Approve <b>${pending.length}</b> user yang menunggu?`, confirmLabel: "Approve Semua" });
    if (!ok) return;
    let done = 0;
    for (const u of pending) {
      try { const r = await fetchAPI(`/api/admin/users/${u.id}/approve`, { method: "POST" }); if (r.ok) done++; } catch (_) {}
    }
    toast(`${done}/${pending.length} user di-approve`, done === pending.length ? "success" : "warning");
    await loadUsers();
  });

  // ═══════════════════════ CITIES ═══════════════════════
  async function loadCities() {
    const res = await fetchAPI("/api/cities");
    const data = await res.json();
    allCities = data.cities || [];
    renderDashboard();
    renderCities();
  }

  function filteredCities() {
    const q = ($("#city-search").value || "").toLowerCase().trim();
    const defOnly = $("#city-default-only").checked;
    let list = allCities.filter((c) => {
      if (defOnly && !c.is_default) return false;
      if (q && !(`${c.name} ${c.country || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    list.sort((a, b) => {
      const k = citySort.key;
      let va = a[k] ?? "", vb = b[k] ?? "";
      if (typeof va === "boolean") { va = va ? 1 : 0; vb = vb ? 1 : 0; }
      return (va < vb ? -1 : va > vb ? 1 : 0) * citySort.dir;
    });
    return list;
  }

  function renderCities() {
    const list = filteredCities();
    $("#cities-count").textContent = list.length;
    $("#cities-empty").classList.toggle("hidden", list.length > 0);
    const tbody = $("#cities-body");
    tbody.innerHTML = list.map((c) => `
      <tr data-id="${c.id}">
        <td><input class="input input-bordered input-xs w-14" data-field="order" value="${c.order}"></td>
        <td><input class="input input-bordered input-xs w-32" data-field="name" value="${escapeHTML(c.name)}"></td>
        <td><input class="input input-bordered input-xs w-28" data-field="country" value="${escapeHTML(c.country || "")}"></td>
        <td><input class="input input-bordered input-xs w-24" data-field="lat" type="number" step="any" value="${c.lat}"></td>
        <td><input class="input input-bordered input-xs w-24" data-field="lon" type="number" step="any" value="${c.lon}"></td>
        <td><input class="input input-bordered input-xs w-14" data-field="tz" type="number" step="any" value="${c.tz}"></td>
        <td><input class="input input-bordered input-xs w-20" data-field="elevation" type="number" step="any" value="${c.elevation ?? 0}"></td>
        <td><input class="input input-bordered input-xs w-16" data-field="temperature" type="number" step="any" value="${c.temperature ?? 0}" title="Suhu rata-rata iklim (°C). Tekanan dihitung otomatis dari elevasi."></td>
        <td class="text-center"><input type="checkbox" class="checkbox checkbox-xs" data-field="is_default" ${c.is_default ? "checked" : ""}></td>
        <td class="text-right whitespace-nowrap">
          <button class="btn btn-success btn-xs" data-action="save">Simpan</button>
          <button class="btn btn-error btn-xs" data-action="delete">Hapus</button>
        </td>
      </tr>`).join("");
    tbody.querySelectorAll("button[data-action]").forEach((b) => b.addEventListener("click", onCityAction));
  }

  $("#city-search").addEventListener("input", window.debounce(renderCities, 200));
  $("#city-default-only").addEventListener("change", renderCities);
  $$('#panel-cities th[data-csort]').forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.csort;
    citySort = { key: k, dir: citySort.key === k ? -citySort.dir : 1 };
    renderCities();
  }));

  function readCityRow(tr) {
    return {
      name: tr.querySelector('[data-field="name"]').value.trim(),
      country: tr.querySelector('[data-field="country"]').value.trim(),
      lat: parseFloat(tr.querySelector('[data-field="lat"]').value),
      lon: parseFloat(tr.querySelector('[data-field="lon"]').value),
      tz: parseFloat(tr.querySelector('[data-field="tz"]').value),
      elevation: parseFloat(tr.querySelector('[data-field="elevation"]').value || "0"),
      temperature: parseFloat(tr.querySelector('[data-field="temperature"]').value || "0"),
      // pressure dibiarkan kosong → backend hitung dari elevasi (barometrik).
      order: parseInt(tr.querySelector('[data-field="order"]').value, 10),
      is_default: tr.querySelector('[data-field="is_default"]').checked,
    };
  }

  async function onCityAction(ev) {
    const action = ev.target.dataset.action;
    const tr = ev.target.closest("tr");
    const id = tr.dataset.id;
    if (action === "save") {
      const body = readCityRow(tr);
      try {
        const res = await fetchAPI(`/api/admin/cities/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); toast(`Gagal: ${e.error || res.status}`, "error"); return; }
        toast(`Tersimpan: ${body.name}`, "success");
        const idx = allCities.findIndex((c) => c.id === id);
        if (idx >= 0) allCities[idx] = { ...allCities[idx], ...body };
        renderDashboard();
      } catch (err) { toast(`Error: ${err.message}`, "error"); }
    } else if (action === "delete") {
      const c = allCities.find((x) => x.id === id);
      const ok = await confirmDialog({ title: "Hapus kota?", body: `Hapus <b>${escapeHTML(c?.name || "kota ini")}</b>? Tindakan ini permanen.`, confirmLabel: "Hapus", danger: true });
      if (!ok) return;
      try {
        const res = await fetchAPI(`/api/admin/cities/${id}`, { method: "DELETE" });
        if (!res.ok) { const e = await res.json().catch(() => ({})); toast(`Gagal: ${e.error || res.status}`, "error"); return; }
        allCities = allCities.filter((x) => x.id !== id);
        toast("Kota dihapus", "success");
        renderCities(); renderDashboard();
      } catch (err) { toast(`Error: ${err.message}`, "error"); }
    }
  }

  // Tambah kota.
  $("#create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const body = {
      name: f.get("name").trim(), country: f.get("country").trim(),
      lat: parseFloat(f.get("lat")), lon: parseFloat(f.get("lon")),
      tz: parseFloat(f.get("tz")), elevation: parseFloat(f.get("elevation") || "0"),
      temperature: parseFloat(f.get("temperature") || "0"), // pressure → backend dari elevasi
      order: parseInt(f.get("order") || "99", 10), is_default: f.get("is_default") === "on",
    };
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    try {
      const res = await fetchAPI("/api/admin/cities", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast(`Error: ${data.error || res.status}`, "error"); return; }
      toast(`Kota ditambahkan: ${data.name || body.name}`, "success");
      e.target.reset();
      await loadCities();
    } catch (err) { toast(`Error: ${err.message}`, "error"); }
    finally { setLoading(btn, false); }
  });

  // Ekspor CSV kota (yang sedang tampil/terfilter).
  $("#city-export").addEventListener("click", () => {
    const list = filteredCities();
    if (!list.length) { toast("Tidak ada kota untuk diekspor", "warning"); return; }
    downloadCSV("kota.csv",
      ["name", "country", "lat", "lon", "tz", "elevation", "temperature", "pressure", "order", "is_default"],
      list.map((c) => [c.name, c.country || "", c.lat, c.lon, c.tz, c.elevation ?? 0, c.temperature ?? 0, c.pressure ?? 0, c.order, c.is_default]));
    toast(`${list.length} kota diekspor`, "success");
  });

  // Impor CSV kota (header: name,country,lat,lon,tz,elevation[,temperature,pressure],order,is_default).
  $("#city-import").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const text = await file.text();
    ev.target.value = "";
    const rows = parseCSV(text);
    if (rows.length < 2) { toast("CSV kosong/tak valid", "error"); return; }
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idx = (k) => header.indexOf(k);
    const numAt = (r, k) => (idx(k) >= 0 ? parseFloat(r[idx(k)]) || 0 : 0);
    const records = rows.slice(1).filter((r) => r.length && r[idx("name")]).map((r) => ({
      name: (r[idx("name")] || "").trim(),
      country: (r[idx("country")] || "").trim(),
      lat: parseFloat(r[idx("lat")]), lon: parseFloat(r[idx("lon")]),
      tz: parseFloat(r[idx("tz")]) || 0, elevation: parseFloat(r[idx("elevation")]) || 0,
      temperature: numAt(r, "temperature"), pressure: numAt(r, "pressure"),
      order: parseInt(r[idx("order")], 10) || 99,
      is_default: /^(true|1|ya|yes)$/i.test((r[idx("is_default")] || "").trim()),
    }));
    const ok = await confirmDialog({ title: "Impor kota?", body: `Tambahkan <b>${records.length}</b> kota dari CSV?`, confirmLabel: "Impor" });
    if (!ok) return;
    let done = 0;
    for (const rec of records) {
      if (!rec.name || isNaN(rec.lat) || isNaN(rec.lon)) continue;
      try { const r = await fetchAPI("/api/admin/cities", { method: "POST", body: JSON.stringify(rec) }); if (r.ok) done++; } catch (_) {}
    }
    toast(`${done}/${records.length} kota diimpor`, done === records.length ? "success" : "warning");
    await loadCities();
  });

  // Parser CSV sederhana (dukung kutip ganda & koma dalam field).
  function parseCSV(text) {
    const rows = []; let row = [], field = "", inQ = false;
    text = text.replace(/^﻿/, "");
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        if (field !== "" || row.length) { row.push(field); rows.push(row); row = []; field = ""; }
      } else field += ch;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
})();
