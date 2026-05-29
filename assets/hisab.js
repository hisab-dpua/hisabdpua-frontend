// hisab.js — laporan multi-kota, satu metode.

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const status = $("#status");
  let citiesCache = [];

  // Greet + cek admin role + gate approval.
  try {
    const meRes = await fetchAPI("/me");
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.role !== "admin" && me.approval_status !== "approved") {
        window.location.href = "pending-approval.html";
        return;
      }
      $("#user-greet").textContent = `👤 ${me.name}`;
      if (me.role === "admin") $("#admin-link").classList.remove("hidden");
    }
  } catch {}

  // Load kota.
  try {
    const res = await fetchAPI("/api/cities");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    citiesCache = data.cities;
    renderCheckboxes();
  } catch (err) {
    $("#city-checkboxes").textContent = `Gagal memuat: ${err.message}`;
  }

  function renderCheckboxes() {
    const wrap = $("#city-checkboxes");
    wrap.innerHTML = "";
    for (const c of citiesCache) {
      const label = document.createElement("label");
      label.className = "label cursor-pointer justify-start gap-2";
      label.innerHTML = `
        <input type="checkbox" class="checkbox checkbox-sm city-cb" value="${c.id}" ${c.is_default ? "checked" : ""}>
        <span class="label-text text-sm">${c.name}${c.is_default ? " ⭐" : ""}</span>
      `;
      wrap.appendChild(label);
    }
  }

  $("#select-default").onclick = () => $$(".city-cb").forEach(cb => {
    const c = citiesCache.find(x => x.id === cb.value);
    cb.checked = c && c.is_default;
  });
  $("#select-all").onclick = () => $$(".city-cb").forEach(cb => cb.checked = true);
  $("#select-none").onclick = () => $$(".city-cb").forEach(cb => cb.checked = false);

  $("#hisab-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Menghitung…";
    const form = new FormData(e.target);
    const cityIDs = $$(".city-cb:checked").map(cb => cb.value);
    const body = {
      method: form.get("method"),
      month: parseInt(form.get("month"), 10),
      year: parseInt(form.get("year"), 10),
      elevation: parseFloat(form.get("elevation") || "0"),
      city_ids: cityIDs.length === 16 && cityIDs.every(id => citiesCache.find(c => c.id === id)?.is_default)
        ? [] // semua default → kirim kosong agar pakai default server-side
        : cityIDs,
    };

    try {
      const res = await fetchAPI("/api/hisab/report", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        status.textContent = `Error: ${data.error || res.statusText}`;
        return;
      }
      renderReport(data);
      status.textContent = `${data.rows.length} kota dihitung.`;
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    }
  });

  function renderReport(d) {
    $("#result").classList.remove("hidden");
    const monthIDN = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal",
      "Jumadil Akhir", "Rajab", "Syakban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah"];

    $("#result-title").textContent =
      `Awal ${monthIDN[d.month]} ${d.year} H — Metode ${d.method_label}`;
    $("#result-ijtima").textContent = `Ijtima': ${d.ijtima_info}`;
    $("#th-day0").textContent = `Irtifa ${d.date_rukyat}`;
    $("#th-day1").textContent = `Irtifa ${d.date_plus1}`;

    const tbody = $("#result-body");
    tbody.innerHTML = "";
    d.rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${r.city_name}${r.country && r.country !== "Indonesia" ? ` <span class="badge badge-xs">${r.country}</span>` : ""}</td>
        <td class="font-mono text-xs">${r.sunset}</td>
        <td class="font-mono text-xs">${r.moonset}</td>
        <td class="font-mono text-xs">${r.ijtima_local}</td>
        <td class="font-mono text-xs">${r.altitude_center}</td>
        <td class="font-mono text-xs">${r.elongation}</td>
        <td class="font-mono text-xs">${r.altitude_plus1}</td>
        <td>${r.visible ? '<span class="badge badge-success badge-sm">✓</span>' : '<span class="badge badge-warning badge-sm">×</span>'}</td>
      `;
      tbody.appendChild(tr);
    });

    $("#result-json").textContent = JSON.stringify(d, null, 2);
  }
})();
