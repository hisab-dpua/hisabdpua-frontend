// hisab.js — populate kota dropdown + form submit + render dual table.

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const status = $("#status");
  let lastQuery = null;

  // Greet user (best-effort).
  try {
    const meRes = await fetchAPI("/me");
    if (meRes.ok) {
      const me = await meRes.json();
      document.querySelector("#user-greet").textContent = `👤 ${me.name}`;
    }
  } catch {}

  // Populate cities dropdown.
  try {
    const res = await fetchAPI("/api/cities");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const sel = $("#city-select");
    sel.innerHTML = "";
    for (const c of data.cities) {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = `${c.name} (${c.country})`;
      if (c.name === "Jakarta") opt.selected = true;
      sel.appendChild(opt);
    }
  } catch (err) {
    status.textContent = `Gagal memuat daftar kota: ${err.message}`;
  }

  $("#hisab-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Menghitung…";

    const form = new FormData(e.target);
    const body = {
      month: parseInt(form.get("month"), 10),
      year: parseInt(form.get("year"), 10),
      city: form.get("city"),
      elevation: parseFloat(form.get("elevation") || "0"),
    };

    try {
      const res = await fetchAPI("/api/hisab", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        status.textContent = `Error: ${data.error || res.statusText}`;
        return;
      }
      lastQuery = body;
      $("#save-status").textContent = "";
      renderResult(data);
      status.textContent = "Selesai.";
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    }
  });

  $("#save-btn").addEventListener("click", async () => {
    if (!lastQuery) return;
    const saveStatus = $("#save-status");
    saveStatus.textContent = "Menyimpan…";
    try {
      const res = await fetchAPI("/api/hisab/save", {
        method: "POST",
        body: JSON.stringify(lastQuery),
      });
      const data = await res.json();
      if (!res.ok) {
        saveStatus.textContent = `Error: ${data.error || res.statusText}`;
        return;
      }
      saveStatus.innerHTML = `Tersimpan. <a href="/history" class="link link-primary">Buka riwayat</a>`;
    } catch (err) {
      saveStatus.textContent = `Error: ${err.message}`;
    }
  });

  function renderResult(d) {
    $("#result").classList.remove("hidden");
    const monthIDN = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal",
      "Jumadil Akhir", "Rajab", "Syakban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah"];
    $("#result-title").textContent =
      `Awal ${monthIDN[d.input.month]} ${d.input.year} H — ${d.location.name}`;
    $("#result-subtitle").textContent =
      `${d.location.lat.toFixed(4)}°, ${d.location.lon.toFixed(4)}°, UTC${d.location.tz >= 0 ? "+" : ""}${d.location.tz}, elev ${d.location.elevation} m`;

    const rows = [
      ["Ijtima' (waktu)",
        `${d.ijtima.im.time_local} <span class="text-xs text-base-content/60">(${d.ijtima.im.time_tt} TT)</span>`,
        d.ijtima.aniq.time_local],
      ["Ijtima' (tanggal)",
        `${d.ijtima.im.weekday} ${d.ijtima.im.pasaran}, ${d.ijtima.im.date_local}`,
        `${d.ijtima.aniq.weekday} ${d.ijtima.aniq.pasaran}, ${d.ijtima.aniq.date_local}`],
      ["Yaum (Aniq)", "—",
        `natural ${d.ijtima.aniq.yaum_natural} → +1: ${d.ijtima.aniq.yaum_next}`],
      ["—— Hari rukyat: " + d.day_rukyat.label + " ——", "", ""],
      ["Ghurub asy-syams", d.day_rukyat.im.sunset, d.day_rukyat.aniq.sunset],
      ["Ghurub al-qomar", d.day_rukyat.im.moonset, d.day_rukyat.aniq.moonset],
      ["Irtifa (titik tengah)",
        d.day_rukyat.im.altitude_center, d.day_rukyat.aniq.altitude_center],
      ["Elongasi geosentrik",
        d.day_rukyat.im.elongation, d.day_rukyat.aniq.elongation],
      ["MABIMS (irtifa≥3° & elong≥6.4°)",
        badge(d.day_rukyat.im.visible),
        badge(d.day_rukyat.aniq.visible)],
      ["—— Hari +1: " + d.day_rukyat_plus1.label + " ——", "", ""],
      ["Irtifa (titik tengah)",
        d.day_rukyat_plus1.im.altitude_center,
        d.day_rukyat_plus1.aniq.altitude_center],
    ];

    const tbody = $("#result-body");
    tbody.innerHTML = "";
    for (const [label, im, aniq] of rows) {
      const tr = document.createElement("tr");
      if (label.startsWith("——")) {
        const td = document.createElement("td");
        td.colSpan = 3;
        td.className = "font-semibold bg-base-200 text-center";
        td.textContent = label.replace(/—/g, "").trim();
        tr.appendChild(td);
      } else {
        const tdL = document.createElement("td");
        tdL.className = "font-medium";
        tdL.textContent = label;
        const tdI = document.createElement("td"); tdI.innerHTML = im;
        const tdA = document.createElement("td"); tdA.innerHTML = aniq;
        tr.append(tdL, tdI, tdA);
      }
      tbody.appendChild(tr);
    }

    $("#result-json").textContent = JSON.stringify(d, null, 2);
  }

  function badge(visible) {
    if (visible) return `<span class="badge badge-success">Lulus</span>`;
    return `<span class="badge badge-warning">Tidak lulus</span>`;
  }
})();
