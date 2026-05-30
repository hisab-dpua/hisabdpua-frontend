// maghib.js — laporan 16 kota metode Maghīb al-Qamarain (dua varian).

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const status = $("#status");
  const submitBtn = $("#submit-btn");
  let citiesCache = [];
  let lastData = null;   // simpan respons agar tab bisa render ulang tanpa fetch
  let activeTab = "literal";

  const monthIDN = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal",
    "Jumadil Akhir", "Rajab", "Syakban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah"];

  // Auth gate + navbar.
  try {
    const meRes = await fetchAPI("/me");
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.role !== "admin" && me.approval_status !== "approved") {
        window.location.href = "pending-approval.html";
        return;
      }
      mountNav("maghib", me);
    } else {
      mountNav("maghib", null);
    }
  } catch {
    mountNav("maghib", null);
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
        <span class="label-text text-sm">${c.name}${c.is_default ? " ⭐" : ""}</span>`;
      wrap.appendChild(label);
    }
  }

  $("#select-default").onclick = () => $$(".city-cb").forEach(cb => {
    const c = citiesCache.find(x => x.id === cb.value);
    cb.checked = c && c.is_default;
  });
  $("#select-all").onclick = () => $$(".city-cb").forEach(cb => cb.checked = true);
  $("#select-none").onclick = () => $$(".city-cb").forEach(cb => cb.checked = false);

  $("#maghib-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    setLoading(submitBtn, true);
    const form = new FormData(e.target);
    const cityIDs = $$(".city-cb:checked").map(cb => cb.value);
    const allDefault = cityIDs.length === 16 && cityIDs.every(id => citiesCache.find(c => c.id === id)?.is_default);
    const body = {
      month: parseInt(form.get("month"), 10),
      year: parseInt(form.get("year"), 10),
      city_ids: allDefault ? [] : cityIDs,
    };
    try {
      const res = await fetchAPI("/api/hisab/maghib", { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        status.textContent = `Error: ${data.error || res.statusText}`;
        return;
      }
      lastData = data;
      renderHeader(data);
      mgShowTab("literal");
      status.textContent = `${data.literal.length} kota dihitung.`;
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    } finally {
      setLoading(submitBtn, false);
    }
  });

  function renderHeader(d) {
    $("#empty-state").classList.add("hidden");
    $("#result").classList.remove("hidden");
    $("#result-title").textContent = `Awal ${monthIDN[d.month]} ${d.year} H — ${d.method_label}`;
    $("#result-ijtima").textContent = `Ijtima': ${d.ijtima_info}`;
    $("#result-awal").innerHTML = `Awal bulan: <b>${d.awal_bulan}</b>` +
      (d.istikmal ? ` <span class="badge badge-warning badge-sm">istikmal</span>` : "");
    $("#result-note").textContent = d.note || "";
    $("#result-json").textContent = JSON.stringify(d, null, 2);
  }

  // Dipakai oleh atribut onclick di HTML.
  window.mgShowTab = function (which) {
    if (!lastData) return;
    activeTab = which;
    $("#tab-literal").classList.toggle("tab-active", which === "literal");
    $("#tab-continuity").classList.toggle("tab-active", which === "continuity");
    const rows = which === "continuity" ? lastData.continuity : lastData.literal;
    const tbody = $("#result-body");
    tbody.innerHTML = "";
    for (const r of rows) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.no}</td>
        <td>${r.city_name}${r.country && r.country !== "Indonesia" ? ` <span class="badge badge-xs">${r.country}</span>` : ""}</td>
        <td class="font-mono text-xs">${r.lon}</td>
        <td class="font-mono text-xs">${r.ijtima}</td>
        <td class="font-mono text-xs">${r.irtifa}</td>
        <td class="font-mono text-xs">${r.mukuts}</td>
        <td class="font-mono text-xs">${r.nur_hilal}</td>
        <td class="text-xs">${r.position}</td>`;
      tbody.appendChild(tr);
    }
  };

  $("#export-csv").onclick = () => {
    if (!lastData) return;
    const d = lastData;
    const rows = activeTab === "continuity" ? d.continuity : d.literal;
    const header = ["NO", "Kota", "Negara", "Bujur", "Ijtima", "Irtifa hilal", "Mukuts", "Nur hilal", "Posisi"];
    const data = rows.map(r => [
      r.no, r.city_name, r.country || "", r.lon, r.ijtima, r.irtifa, r.mukuts, r.nur_hilal, r.position,
    ]);
    const variant = activeTab === "continuity" ? "kontinuitas" : "literal";
    const fname = `maghib_${variant}_${monthIDN[d.month]}-${d.year}H.csv`;
    downloadCSV(fname, header, data);
  };
})();
