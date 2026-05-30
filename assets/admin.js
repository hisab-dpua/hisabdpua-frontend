// admin.js — gate akses admin + CRUD kota.

(async function () {
  const $ = (sel) => document.querySelector(sel);

  // Gate: hanya admin yang lihat content.
  try {
    const meRes = await fetchAPI("/me");
    if (!meRes.ok) {
      window.location.href = "login.html";
      return;
    }
    const me = await meRes.json();
    mountNav("admin", me);
    if (me.role !== "admin") {
      $("#forbidden").classList.remove("hidden");
      return;
    }
    $("#admin-content").classList.remove("hidden");
  } catch {
    window.location.href = "login.html";
    return;
  }

  await Promise.all([loadPending(), loadAllUsers(), loadCities()]);

  $("#create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = {
      name: form.get("name").trim(),
      country: form.get("country").trim(),
      lat: parseFloat(form.get("lat")),
      lon: parseFloat(form.get("lon")),
      tz: parseFloat(form.get("tz")),
      elevation: parseFloat(form.get("elevation") || "0"),
      order: parseInt(form.get("order") || "99", 10),
      is_default: form.get("is_default") === "on",
    };
    const msg = $("#create-msg");
    msg.textContent = "Menyimpan…";
    try {
      const res = await fetchAPI("/api/admin/cities", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { msg.textContent = `Error: ${data.error}`; return; }
      msg.textContent = `Tersimpan: ${data.name}`;
      e.target.reset();
      await loadCities();
    } catch (err) { msg.textContent = `Error: ${err.message}`; }
  });

  async function loadCities() {
    const res = await fetchAPI("/api/cities");
    const data = await res.json();
    const tbody = $("#cities-body");
    tbody.innerHTML = "";
    $("#cities-count").textContent = data.count;
    for (const c of data.cities) {
      const tr = document.createElement("tr");
      tr.dataset.id = c.id;
      tr.innerHTML = renderRow(c);
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll("button[data-action]").forEach(btn => btn.addEventListener("click", onAction));
  }

  function renderRow(c) {
    return `
      <td><input class="input input-bordered input-xs w-16" data-field="order" value="${c.order}"></td>
      <td><input class="input input-bordered input-xs w-32" data-field="name" value="${escapeHTML(c.name)}"></td>
      <td><input class="input input-bordered input-xs w-32" data-field="country" value="${escapeHTML(c.country || "")}"></td>
      <td><input class="input input-bordered input-xs w-24" data-field="lat" type="number" step="any" value="${c.lat}"></td>
      <td><input class="input input-bordered input-xs w-24" data-field="lon" type="number" step="any" value="${c.lon}"></td>
      <td><input class="input input-bordered input-xs w-16" data-field="tz" type="number" step="any" value="${c.tz}"></td>
      <td><input class="input input-bordered input-xs w-20" data-field="elevation" type="number" step="any" value="${c.elevation ?? 0}"></td>
      <td><input type="checkbox" class="checkbox checkbox-xs" data-field="is_default" ${c.is_default ? "checked" : ""}></td>
      <td class="flex gap-1">
        <button class="btn btn-success btn-xs" data-action="save">Simpan</button>
        <button class="btn btn-error btn-xs" data-action="delete">Hapus</button>
      </td>
    `;
  }

  async function onAction(ev) {
    const action = ev.target.dataset.action;
    const tr = ev.target.closest("tr");
    const id = tr.dataset.id;
    if (action === "save") {
      const body = {
        name: tr.querySelector('[data-field="name"]').value.trim(),
        country: tr.querySelector('[data-field="country"]').value.trim(),
        lat: parseFloat(tr.querySelector('[data-field="lat"]').value),
        lon: parseFloat(tr.querySelector('[data-field="lon"]').value),
        tz: parseFloat(tr.querySelector('[data-field="tz"]').value),
        elevation: parseFloat(tr.querySelector('[data-field="elevation"]').value || "0"),
        order: parseInt(tr.querySelector('[data-field="order"]').value, 10),
        is_default: tr.querySelector('[data-field="is_default"]').checked,
      };
      try {
        const res = await fetchAPI(`/api/admin/cities/${id}`, { method: "PATCH", body: JSON.stringify(body) });
        if (!res.ok) { const e = await res.json(); alert(`Gagal: ${e.error}`); return; }
        ev.target.textContent = "Tersimpan";
        setTimeout(() => ev.target.textContent = "Simpan", 1500);
      } catch (err) { alert(`Error: ${err.message}`); }
    } else if (action === "delete") {
      if (!confirm(`Hapus kota ini?`)) return;
      try {
        const res = await fetchAPI(`/api/admin/cities/${id}`, { method: "DELETE" });
        if (!res.ok) { const e = await res.json(); alert(`Gagal: ${e.error}`); return; }
        tr.remove();
        $("#cities-count").textContent = parseInt($("#cities-count").textContent, 10) - 1;
      } catch (err) { alert(`Error: ${err.message}`); }
    }
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  async function loadPending() {
    const res = await fetchAPI("/api/admin/users?status=pending");
    const data = await res.json();
    $("#pending-count").textContent = data.count;
    const tbody = $("#pending-body");
    const table = $("#pending-table");
    const empty = $("#pending-empty");
    tbody.innerHTML = "";
    if (data.count === 0) {
      table.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }
    table.classList.remove("hidden");
    empty.classList.add("hidden");
    for (const u of data.users) {
      const tr = document.createElement("tr");
      tr.dataset.id = u.id;
      tr.innerHTML = `
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td class="text-xs">${new Date(u.created_at).toLocaleString("id-ID")}</td>
        <td><button class="btn btn-success btn-xs" data-action="approve">Approve</button></td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll("button[data-action]").forEach(b => b.addEventListener("click", onUserAction));
  }

  async function loadAllUsers() {
    const res = await fetchAPI("/api/admin/users");
    const data = await res.json();
    $("#users-count").textContent = data.count;
    const tbody = $("#users-body");
    tbody.innerHTML = "";
    for (const u of data.users) {
      const tr = document.createElement("tr");
      tr.dataset.id = u.id;
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
      tr.innerHTML = `
        <td>${escapeHTML(u.name)}</td>
        <td>${escapeHTML(u.email)}</td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td class="text-xs">${new Date(u.created_at).toLocaleString("id-ID")}</td>
        <td>${actionBtn}</td>
      `;
      tbody.appendChild(tr);
    }
    tbody.querySelectorAll("button[data-action]").forEach(b => b.addEventListener("click", onUserAction));
  }

  async function onUserAction(ev) {
    const action = ev.target.dataset.action; // "approve" | "revoke"
    const tr = ev.target.closest("tr");
    const id = tr.dataset.id;
    ev.target.disabled = true;
    try {
      const res = await fetchAPI(`/api/admin/users/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const e = await res.json();
        alert(`Gagal: ${e.error}`);
        ev.target.disabled = false;
        return;
      }
      await Promise.all([loadPending(), loadAllUsers()]);
    } catch (err) {
      alert(`Error: ${err.message}`);
      ev.target.disabled = false;
    }
  }
})();
