// alfalak-hilal.js — panggil /api/alfalak/hilal, tampilkan ephemeris + kriteria.
// Halaman publik (endpoint tanpa auth); navbar di-mount graceful seperti maghib.
(async function () {
  try {
    const meRes = await fetchAPI("/me");
    mountNav("alfalak", meRes.ok ? await meRes.json() : null);
  } catch (_) {
    mountNav("alfalak", null);
  }

  const form = document.getElementById("alfalak-hilal-form");
  const statusEl = document.getElementById("status");
  const ephCard = document.getElementById("ephemeris");
  const ephGrid = document.getElementById("ephemeris-grid");
  const critCard = document.getElementById("criteria");
  const critRows = document.getElementById("criteria-rows");

  function setStatus(kind, msg) {
    statusEl.className = "alert alert-" + kind;
    statusEl.textContent = msg;
    statusEl.classList.remove("hidden");
  }
  function clearStatus() {
    statusEl.classList.add("hidden");
  }

  function fmtDeg(v) {
    if (v == null || isNaN(v)) return "—";
    return Number(v).toFixed(4) + "°";
  }
  function fmtHM(h) {
    if (h == null || isNaN(h)) return "—";
    let neg = h < 0;
    h = Math.abs(h);
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    const ss = Math.round(((h - hh) * 60 - mm) * 60);
    return (neg ? "-" : "") + String(hh).padStart(2, "0") + ":" +
      String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  }

  const EPH_LABELS = [
    ["sunset_local", "Matahari terbenam", fmtHM],
    ["moonset_local", "Bulan terbenam", fmtHM],
    ["lag_time_hours", "Lag time", fmtHM],
    ["moon_age_hours", "Umur bulan", fmtHM],
    ["moon_altitude_topo", "Tinggi bulan (topo)", fmtDeg],
    ["moon_elongation_topo", "Elongasi (topo)", fmtDeg],
    ["crescent_width_arcmin", "Lebar sabit (')", (v) => Number(v).toFixed(3) + "'"],
    ["illumination_percent", "Iluminasi", (v) => Number(v).toFixed(3) + "%"],
  ];

  function renderEphemeris(eph) {
    ephGrid.innerHTML = "";
    for (const [key, label, fmt] of EPH_LABELS) {
      const div = document.createElement("div");
      div.className = "flex flex-col border rounded p-2 bg-base-200/40";
      div.innerHTML =
        '<span class="text-base-content/60">' + label + "</span>" +
        '<span class="font-mono font-semibold">' + fmt(eph[key]) + "</span>";
      ephGrid.appendChild(div);
    }
    ephCard.classList.remove("hidden");
  }

  function renderCriteria(criteria) {
    critRows.innerHTML = "";
    // Urutan tampil yang masuk akal.
    const order = ["MABIMS", "WujudulHilal", "Odeh", "Yallop", "Turkey",
      "IjtimaQoblaGhurub", "KHGT"];
    const keys = Object.keys(criteria).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    for (const k of keys) {
      const c = criteria[k];
      const tr = document.createElement("tr");
      const badge = c.is_visible
        ? '<span class="badge badge-success badge-sm">Terlihat</span>'
        : '<span class="badge badge-ghost badge-sm">Tidak terlihat</span>';
      tr.innerHTML =
        "<td class='font-medium'>" + c.criteria_name + "</td>" +
        "<td>" + badge + "</td>" +
        "<td class='text-xs text-base-content/70'>" + (c.additional_info || "") + "</td>";
      critRows.appendChild(tr);
    }
    critCard.classList.remove("hidden");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();
    ephCard.classList.add("hidden");
    critCard.classList.add("hidden");
    setStatus("info", "Menghitung…");

    const fd = new FormData(form);
    const body = {
      latitude: parseFloat(fd.get("latitude")),
      longitude: parseFloat(fd.get("longitude")),
      elevation: parseFloat(fd.get("elevation")),
      timezone: parseFloat(fd.get("timezone")),
      year: parseInt(fd.get("year"), 10),
      month: parseInt(fd.get("month"), 10),
      day: parseFloat(fd.get("day")),
    };

    try {
      const res = await fetch(window.API_BASE + "/api/alfalak/hilal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("error", "Gagal: " + (err.error || res.status));
        return;
      }
      const data = await res.json();
      clearStatus();
      renderEphemeris(data.ephemeris || {});
      renderCriteria(data.criteria || {});
    } catch (err) {
      setStatus("error", "Tidak bisa menghubungi backend: " + err.message);
    }
  });
})();
