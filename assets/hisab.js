// hisab.js — laporan multi-kota, satu metode.

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const status = $("#status");
  const submitBtn = $("#submit-btn");
  let citiesCache = [];
  let lastData = null;

  const monthIDN = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal",
    "Jumadil Akhir", "Rajab", "Syakban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah"];

  // Preselect metode dari query (?method=im|aniq) — dipakai kartu di index.html.
  const methodSel = document.querySelector('select[name="method"]');
  const urlMethod = new URLSearchParams(location.search).get("method");
  if (urlMethod && methodSel && [...methodSel.options].some(o => o.value === urlMethod)) {
    methodSel.value = urlMethod;
  }
  const activeMethod = (methodSel && methodSel.value) || "im"; // untuk active-state navbar

  // Auth gate + navbar.
  try {
    const meRes = await fetchAPI("/me");
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.role !== "admin" && me.approval_status !== "approved") {
        window.location.href = "pending-approval.html";
        return;
      }
      mountNav(activeMethod, me);
    } else {
      mountNav(activeMethod, null);
    }
  } catch {
    mountNav(activeMethod, null);
  }

  // Saat metode diganti via dropdown, perbarui active-state di navbar.
  if (methodSel) {
    methodSel.addEventListener("change", () => {
      document.querySelectorAll("#app-nav a, .navbar a").forEach((a) => {
        if (a.getAttribute("href") === `hisab.html?method=${methodSel.value}`) a.classList.add("btn-active");
        else if (a.getAttribute("href") && a.getAttribute("href").startsWith("hisab.html?method=")) a.classList.remove("btn-active");
      });
    });
  }

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
      label.className = "label cursor-pointer justify-start gap-2 py-1";
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
    status.textContent = "";
    setLoading(submitBtn, true);
    const form = new FormData(e.target);
    const cityIDs = $$(".city-cb:checked").map(cb => cb.value);
    const body = {
      method: form.get("method"),
      month: parseInt(form.get("month"), 10),
      year: parseInt(form.get("year"), 10),
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
      lastData = data;
      renderReport(data);
      const visible = data.rows.filter(r => r.visible).length;
      status.textContent = `${data.rows.length} kota · ${visible} terlihat.`;
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    } finally {
      setLoading(submitBtn, false);
    }
  });

  function renderReport(d) {
    $("#empty-state").classList.add("hidden");
    $("#result").classList.remove("hidden");

    $("#result-title").textContent =
      `Awal ${monthIDN[d.month]} ${d.year} H — ${d.method_label}`;
    $("#result-ijtima").textContent = `Ijtima': ${d.ijtima_info}`;
    $("#th-day0").textContent = `Irtifa ${d.date_rukyat}`;
    $("#th-day1").textContent = `Irtifa ${d.date_plus1}`;

    const tbody = $("#result-body");
    tbody.innerHTML = "";
    d.rows.forEach((r, i) => {
      const tr = document.createElement("tr");
      tr.className = r.visible ? "row-visible" : "row-hidden";
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

  $("#export-csv").onclick = () => {
    if (!lastData) return;
    const d = lastData;
    const header = ["NO", "Kota", "Negara", "Ghurub asy-Syams", "Ghurub al-Qomar",
      "Ijtima (LT)", `Irtifa ${d.date_rukyat}`, "Elongasi", `Irtifa ${d.date_plus1}`, "Terlihat"];
    const rows = d.rows.map((r, i) => [
      i + 1, r.city_name, r.country || "", r.sunset, r.moonset, r.ijtima_local,
      r.altitude_center, r.elongation, r.altitude_plus1, r.visible ? "Ya" : "Tidak",
    ]);
    const fname = `hisab_${d.method}_${monthIDN[d.month]}-${d.year}H.csv`;
    downloadCSV(fname, header, rows);
  };
})();
