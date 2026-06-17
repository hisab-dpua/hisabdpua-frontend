// alfalak-hilal.js — panggil /api/alfalak/hilal, tampilkan data LENGKAP:
// ringkasan, visualisasi sabit, tabel ephemeris penuh (geo/topo), kriteria detail,
// export TXT/CSV/print, pemilih kota, kalender Hijriah↔Masehi. Setara desktop.
// Halaman publik; navbar di-mount graceful.
(async function () {
  try {
    const meRes = await fetchAPI("/me");
    mountNav("alfalak", meRes.ok ? await meRes.json() : null);
  } catch (_) {
    mountNav("alfalak", null);
  }

  const form = document.getElementById("alfalak-hilal-form");
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  let lastData = null; // simpan untuk export

  // ===== Pemilih kota dari database (GET /api/cities) — bisa di-CRUD admin =====
  const cityMap = {}; // "Nama — Negara" → {name,country,lat,lon,tz,elevation}
  (async function loadCities() {
    try {
      // Kota dari database (koleksi cities) via backend — bisa di-CRUD admin.
      const res = await fetch(window.API_BASE + "/api/cities");
      if (!res.ok) return;
      const data = await res.json();
      const dl = document.getElementById("city-list");
      const frag = document.createDocumentFragment();
      (data.cities || []).forEach((city) => {
        const country = city.country || "";
        const key = country ? `${city.name} — ${country}` : city.name;
        cityMap[key] = city;
        const opt = document.createElement("option");
        opt.value = key;
        frag.appendChild(opt);
      });
      dl.appendChild(frag);
    } catch (_) { /* offline / backend mati: form manual tetap jalan */ }
  })();

  const citySearch = document.getElementById("city-search");
  if (citySearch) citySearch.addEventListener("change", () => {
    const c = cityMap[citySearch.value];
    if (!c) return;
    form.loc_name.value = c.name;
    form.country.value = c.country || "";
    form.latitude.value = c.lat;
    form.longitude.value = c.lon;
    form.timezone.value = c.tz;
    form.elevation.value = c.elevation; // field DB: elevation (bukan elev)
  });

  // ===== Toggle kalender Masehi ↔ Hijriah =====
  let calMode = "greg"; // greg | hijri
  const HIJRI_MONTHS = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
    "Jumadil Awal", "Jumadil Akhir", "Rajab", "Syakban", "Ramadan", "Syawal",
    "Zulkaidah", "Zulhijah"];
  const btnGreg = document.getElementById("cal-greg");
  const btnHijri = document.getElementById("cal-hijri");
  const calHint = document.getElementById("cal-hint");

  async function convertDate(direction, y, m, d) {
    const res = await fetch(window.API_BASE + "/api/alfalak/convert", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction, year: y, month: m, day: d }),
    });
    if (!res.ok) throw new Error("convert failed");
    return res.json();
  }

  if (btnGreg) btnGreg.addEventListener("click", async () => {
    if (calMode === "greg") return;
    // konversi Hijri → Masehi sebelum pindah mode
    try {
      const r = await convertDate("h2g", +form.year.value, +form.month.value, +form.day.value);
      form.year.value = r.gregorian.year; form.month.value = r.gregorian.month; form.day.value = r.gregorian.day;
    } catch (_) {}
    calMode = "greg"; btnGreg.classList.add("btn-active"); btnHijri.classList.remove("btn-active");
    calHint.textContent = "";
  });
  if (btnHijri) btnHijri.addEventListener("click", async () => {
    if (calMode === "hijri") return;
    try {
      const r = await convertDate("g2h", +form.year.value, +form.month.value, +form.day.value);
      form.year.value = r.hijri.year; form.month.value = r.hijri.month; form.day.value = r.hijri.day;
      calHint.textContent = `${r.hijri.day} ${HIJRI_MONTHS[r.hijri.month]} ${r.hijri.year} H`;
    } catch (_) { calHint.textContent = "(konversi butuh backend)"; }
    calMode = "hijri"; btnHijri.classList.add("btn-active"); btnGreg.classList.remove("btn-active");
  });

  // ---------- format helper ----------
  function setStatus(kind, msg) {
    statusEl.className = "alert alert-" + kind;
    statusEl.textContent = msg;
    statusEl.classList.remove("hidden");
  }
  const clearStatus = () => statusEl.classList.add("hidden");

  function dms(v) {
    if (v == null || isNaN(v)) return "—";
    const neg = v < 0; v = Math.abs(v);
    const d = Math.floor(v), m = Math.floor((v - d) * 60), s = Math.round(((v - d) * 60 - m) * 60);
    return (neg ? "-" : "") + d + "° " + String(m).padStart(2, "0") + "' " + String(s).padStart(2, "0") + '"';
  }
  function hms(v) { // jam desimal → HH:MM:SS
    if (v == null || isNaN(v)) return "—";
    const neg = v < 0; v = Math.abs(v);
    const h = Math.floor(v), m = Math.floor((v - h) * 60), s = Math.round(((v - h) * 60 - m) * 60);
    return (neg ? "-" : "") + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function ra2hms(deg) { // RA derajat → jam-menit-detik
    if (deg == null || isNaN(deg)) return "—";
    let h = deg / 15; const hh = Math.floor(h), mm = Math.floor((h - hh) * 60), ss = Math.round(((h - hh) * 60 - mm) * 60);
    return String(hh).padStart(2, "0") + "h " + String(mm).padStart(2, "0") + "m " + String(ss).padStart(2, "0") + "s";
  }
  const num = (v, d = 3) => (v == null || isNaN(v)) ? "—" : Number(v).toFixed(d);
  function row(label, val) {
    return `<div class="flex justify-between gap-2"><span class="opacity-70">${label}</span><span class="font-mono font-medium text-right">${val}</span></div>`;
  }
  const check = (ok) => ok
    ? '<svg class="w-4 h-4 inline text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    : '<svg class="w-4 h-4 inline text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';

  // ---------- PENILAIAN VISIBILITAS (banner, ala desktop) ----------
  function renderVerdict(data) {
    const e = data.ephemeris, det = data.criteria_detailed;
    // Acuan utama: MABIMS 2021 (kriteria resmi Indonesia).
    const visible = det.mabims_new.IsVisible;
    const alt = e.moon_altitude.topo, elong = det.mabims_new.GeocentricElongation, age = e.moon_age_hours;
    const checks = [
      [`Tinggi bulan ≥ 3°`, alt >= 3, `${num(alt, 2)}°`],
      [`Elongasi ≥ 6.4°`, elong >= 6.4, `${num(elong, 2)}°`],
      [`Umur bulan > 0`, age > 0, hms(age)],
    ];
    const cls = visible ? "bg-success/15 border-success" : "bg-error/10 border-error";
    const icon = visible
      ? '<svg class="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
      : '<svg class="w-10 h-10 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    document.getElementById("verdict").className = `card shadow-lg border-l-4 ${cls} p-5`;
    document.getElementById("verdict").innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex items-center gap-3">
          ${icon}
          <div>
            <div class="text-xs uppercase opacity-60">Penilaian (MABIMS 2021)</div>
            <div class="text-xl font-bold">${visible ? "HILAL TERLIHAT" : "HILAL TIDAK TERLIHAT"}</div>
          </div>
        </div>
        <div class="sm:ml-auto flex flex-wrap gap-x-5 gap-y-1 text-sm">
          ${checks.map(([l, ok, v]) => `<span class="inline-flex items-center gap-1.5">${check(ok)} ${l}: <b class="font-mono">${v}</b></span>`).join("")}
        </div>
      </div>`;
  }

  // ---------- Informasi Dasar ----------
  function renderBasicInfo(data, body) {
    const L = data.location, D = data.date;
    document.getElementById("basic-info").innerHTML =
      row("Tanggal", `${D.day}/${D.month}/${D.year} M`) +
      row("Lokasi", `${num(L.latitude, 4)}°, ${num(L.longitude, 4)}°`) +
      row("Elevasi", `${L.elevation} m`) +
      row("Zona waktu", `UTC${L.timezone >= 0 ? "+" : ""}${L.timezone}`) +
      row("JD (saat magrib)", num(data.ephemeris.jd, 6)) +
      row("Delta T", `${num(data.ephemeris.delta_t, 2)} dtk`);
  }

  // ---------- Posisi Bulan (toposentrik) ----------
  function renderMoonPos(e) {
    document.getElementById("moon-pos").innerHTML =
      row("Tinggi (topo)", dms(e.moon_altitude.topo)) +
      row("Azimut (topo)", dms(e.moon_azimuth.topo)) +
      row("Elongasi (topo)", dms(e.elongation.topo)) +
      row("ARCV", `${num(e.arcv_deg, 3)}°`) +
      row("Lebar sabit", `${num(e.crescent_width_arcmin, 3)}'`) +
      row("Umur bulan", hms(e.moon_age_hours)) +
      row("Jarak bulan", `${num(e.moon_dist_km, 0)} km`) +
      row("Semidiameter", `${num(e.moon_semidiameter_arcmin, 2)}'`) +
      row("Parallax", `${num(e.moon_hparallax_deg * 60, 2)}'`);
  }

  // ---------- Data Matahari ----------
  function renderSunData(e) {
    document.getElementById("sun-data").innerHTML =
      row("Matahari terbenam", hms(e.sunset_local) + " WD") +
      row("Tinggi (topo)", dms(e.sun_altitude.topo)) +
      row("Azimut (topo)", dms(e.sun_azimuth.topo)) +
      row("Equation of time", `${num(e.equation_of_time_min, 2)} mnt`) +
      row("Semidiameter", `${num(e.sun_semidiameter_arcmin, 2)}'`) +
      row("Jarak matahari", `${num(e.sun_dist_km / 1e6, 3)} jt km`) +
      row("Refraksi (ufuk)", `${num(e.sun_refraction_arcmin, 2)}'`);
  }

  // ---------- ringkasan (kartu stat dgn aksen) ----------
  function renderSummary(e) {
    const items = [
      ["Matahari terbenam", hms(e.sunset_local), "WD", "primary"],
      ["Bulan terbenam", hms(e.moonset_local), "WD", "primary"],
      ["Lag time", hms(e.lag_time), "", "secondary"],
      ["Umur bulan", hms(e.moon_age_hours), "", "secondary"],
      ["Tinggi bulan (topo)", dms(e.moon_altitude.topo), "", "accent"],
      ["Elongasi (topo)", dms(e.elongation.topo), "", "accent"],
      ["Lebar sabit", num(e.crescent_width_arcmin, 3), "'", "accent"],
      ["Iluminasi", num(e.illumination_pct, 3), "%", "accent"],
      ["Delta T", num(e.delta_t, 2), "dtk", "neutral"],
    ];
    document.getElementById("summary-grid").innerHTML = items.map(([k, v, u, c]) =>
      `<div class="rounded-lg p-3 bg-base-200/50 border-l-4 border-${c}">
        <div class="text-xs text-base-content/60">${k}</div>
        <div class="font-mono font-semibold text-base">${v}<span class="text-xs text-base-content/50 ml-1">${u}</span></div>
      </div>`).join("");
  }

  // ---------- visualisasi sabit (SVG realistis: glow + bintang) ----------
  function renderMoon(e) {
    const illum = Math.max(0, Math.min(1, (e.illumination_pct || 0) / 100));
    const R = 64, cx = 80, cy = 80;
    const x = (1 - 2 * illum) * R;
    const sweep = illum < 0.5 ? 0 : 1;
    // Bintang latar (acak tapi deterministik).
    let stars = "";
    const seed = [13, 29, 41, 7, 53, 19, 37, 5, 61, 23, 47, 11];
    for (let i = 0; i < 12; i++) {
      const sx = (seed[i] * 37) % 160, sy = (seed[(i + 3) % 12] * 53) % 160;
      const r = (i % 3 === 0) ? 1.2 : 0.7;
      stars += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="#cbd5e1" opacity="0.5"/>`;
    }
    const svg = `
    <svg width="170" height="170" viewBox="0 0 160 160">
      <defs>
        <radialGradient id="sky" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#020617"/>
        </radialGradient>
        <radialGradient id="lit" cx="35%" cy="35%" r="70%">
          <stop offset="0%" stop-color="#fffbe6"/>
          <stop offset="70%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </radialGradient>
        <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect width="160" height="160" rx="14" fill="url(#sky)"/>
      ${stars}
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="#111827"/>
      <path filter="url(#glow)" d="M ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} A ${Math.abs(x)} ${R} 0 0 ${sweep} ${cx} ${cy - R} Z" fill="url(#lit)"/>
    </svg>`;
    document.getElementById("moon-viz").innerHTML = svg;
    document.getElementById("moon-viz-caption").textContent =
      `Iluminasi ${num(e.illumination_pct, 2)}% · umur ${hms(e.moon_age_hours)}`;
  }

  // ---------- tabel ephemeris penuh ----------
  function gt(row, fmt) { return [fmt(row.geo), fmt(row.topo)]; }
  function renderEphemeris(e) {
    // [label, geoStr, topoStr]; null geo/topo → kolom kosong (single value).
    const rows = [];
    const push = (label, geo, topo) => rows.push([label, geo ?? "", topo ?? ""]);
    const pair = (label, obj, fmt) => { const [g, t] = gt(obj, fmt); push(label, g, t); };

    push("Julian Date (JD)", num(e.jd, 6), "");
    push("Delta T", num(e.delta_t, 2) + " dtk", "");
    push("Konjungsi (Ijtima') JD", num(e.conjunction_jd, 6), "");
    push("Jarak Matahari", num(e.sun_dist_km, 3) + " km", "");
    push("Jarak Bulan", num(e.moon_dist_km, 3) + " km", "");
    push("— Koordinat Ekliptika —", "", "");
    pair("Bujur Matahari", e.sun_longitude, dms);
    pair("Lintang Matahari", e.sun_latitude, dms);
    pair("Bujur Bulan", e.moon_longitude, dms);
    pair("Lintang Bulan", e.moon_latitude, dms);
    push("— Koordinat Ekuator —", "", "");
    pair("Deklinasi Matahari", e.sun_dec, dms);
    pair("Asensiorekta Matahari", e.sun_ra, ra2hms);
    pair("Deklinasi Bulan", e.moon_dec, dms);
    pair("Asensiorekta Bulan", e.moon_ra, ra2hms);
    push("— Koordinat Horizon —", "", "");
    pair("Tinggi Matahari", e.sun_altitude, dms);
    pair("Azimuth Matahari", e.sun_azimuth, dms);
    pair("Tinggi Bulan", e.moon_altitude, dms);
    pair("Azimuth Bulan", e.moon_azimuth, dms);
    push("— Koreksi —", "", "");
    push("Nutasi Bujur", num(e.nutation_long_arcsec, 2) + '"', "");
    push("Nutasi Kemiringan", num(e.nutation_obl_arcsec, 2) + '"', "");
    push("Parallax Matahari", dms(e.sun_hparallax_deg), "");
    push("Parallax Bulan", dms(e.moon_hparallax_deg), "");
    push("— Data Hilal —", "", "");
    pair("Elongasi", e.elongation, dms);
    push("Umur Bulan", hms(e.moon_age_hours), "");
    push("Iluminasi", num(e.illumination_pct, 3) + "%", "");
    push("Lebar Sabit", num(e.crescent_width_arcmin, 3) + "'", "");

    document.getElementById("ephemeris-rows").innerHTML = rows.map(([k, g, t]) => {
      const header = g === "" && t === "";
      if (header) return `<tr class="bg-base-200/60"><td colspan="3" class="font-semibold">${k}</td></tr>`;
      return `<tr><td>${k}</td><td class="text-right font-mono">${g}</td><td class="text-right font-mono">${t}</td></tr>`;
    }).join("");
  }

  // ---------- kriteria detail ----------
  function badge(v) {
    return v ? '<span class="badge badge-success badge-sm">Terlihat</span>'
             : '<span class="badge badge-ghost badge-sm">Tidak</span>';
  }
  function renderCriteria(simple, det) {
    const rows = [];
    const zone = (c) => `zona ${c.VisibilityCode}, q=${num(c.QValue, 3)}, ARCV=${num(c.ARCV, 2)}°, W=${num(c.CrescentWidth, 2)}'`;
    rows.push(["MABIMS 2021", det.mabims_new.IsVisible, `tinggi=${num(det.mabims_new.MoonAltitude, 2)}°, elong=${num(det.mabims_new.GeocentricElongation, 2)}° (≥3°/≥6.4°)`]);
    rows.push(["MABIMS Lama", det.mabims_old.IsVisible, `tinggi=${num(det.mabims_old.MoonAltitude, 2)}°, elong=${num(det.mabims_old.GeocentricElongation, 2)}°, umur=${num(det.mabims_old.MoonAgeHours, 1)}j`]);
    rows.push(["Wujudul Hilal", det.wujudul_hilal.IsVisible, `tinggi=${num(det.wujudul_hilal.MoonAltitude, 2)}° (>0° & ijtimak<magrib)`]);
    rows.push(["Odeh", det.odeh.IsVisible, zone(det.odeh)]);
    rows.push(["Yallop", det.yallop.IsVisible, zone(det.yallop)]);
    rows.push(["Turkey", det.turkey.IsVisible, `tinggi=${num(det.turkey.MoonAltitude, 2)}°, elong=${num(det.turkey.Elongation, 2)}° (≥5°/≥8°)`]);
    rows.push(["Danjon", det.danjon.IsVisible, `tinggi=${num(det.danjon.MoonAltitude, 2)}°, elong=${num(det.danjon.Elongation, 2)}° (>0°/>7°)`]);
    rows.push(["LFNU", det.lfnu.IsVisible, `tinggi=${num(det.lfnu.MoonAltitude, 2)}°, elong=${num(det.lfnu.Elongation, 2)}° (≥2°/≥3°)`]);
    rows.push(["Ijtima Qabla Ghurub", det.ijtima_qabla_ghurub.IsVisible, det.ijtima_qabla_ghurub.IjtimakBeforeMaghrib ? "ijtimak sebelum magrib" : "ijtimak setelah magrib"]);
    rows.push(["KHGT (global)", det.khgt.IsVisible, det.khgt.GlobalVisible ? `terlihat global (lat=${num(det.khgt.EarliestLat, 0)}° lon=${num(det.khgt.EarliestLon, 0)}°)` : "tidak terlihat global"]);

    document.getElementById("criteria-rows").innerHTML = rows.map(([k, v, info]) =>
      `<tr><td class="font-medium">${k}</td><td>${badge(v)}</td><td class="text-right text-xs text-base-content/70">${info}</td></tr>`).join("");
  }

  // ---------- export ----------
  function buildText(d) {
    const e = d.ephemeris, L = d.location, D = d.date;
    let out = "DATA HILAL — Al Falak DPUA\n";
    out += `Lokasi: ${L.latitude}, ${L.longitude} (elev ${L.elevation} m, UTC${L.timezone >= 0 ? "+" : ""}${L.timezone})\n`;
    out += `Tanggal: ${D.year}-${String(D.month).padStart(2, "0")}-${D.day}\n\n`;
    out += `JD: ${num(e.jd, 6)}   Delta T: ${num(e.delta_t, 2)} dtk\n`;
    out += `Sunset: ${hms(e.sunset_local)}   Moonset: ${hms(e.moonset_local)}   Lag: ${hms(e.lag_time)}\n\n`;
    const line = (l, g, t) => l.padEnd(26) + String(g).padStart(16) + (t !== "" ? String(t).padStart(16) : "") + "\n";
    out += line("Tinggi Bulan (topo)", dms(e.moon_altitude.topo), "");
    out += line("Azimuth Bulan (topo)", dms(e.moon_azimuth.topo), "");
    out += line("Elongasi geo/topo", dms(e.elongation.geo), dms(e.elongation.topo));
    out += line("Umur Bulan", hms(e.moon_age_hours), "");
    out += line("Iluminasi", num(e.illumination_pct, 3) + "%", "");
    out += line("Lebar Sabit", num(e.crescent_width_arcmin, 3) + "'", "");
    out += "\nKRITERIA:\n";
    const c = d.criteria_detailed;
    out += `  MABIMS 2021     : ${c.mabims_new.IsVisible ? "TERLIHAT" : "tidak"}\n`;
    out += `  Odeh            : zona ${c.odeh.VisibilityCode} (q=${num(c.odeh.QValue, 3)})\n`;
    out += `  Yallop          : zona ${c.yallop.VisibilityCode} (q=${num(c.yallop.QValue, 3)})\n`;
    out += `  KHGT global     : ${c.khgt.IsVisible ? "TERLIHAT" : "tidak"}\n`;
    return out;
  }
  function buildCSV(d) {
    const e = d.ephemeris;
    const rows = [["Parameter", "Geosentrik", "Toposentrik"]];
    const pr = (l, o, f) => rows.push([l, f(o.geo), f(o.topo)]);
    rows.push(["JD", num(e.jd, 6), ""]);
    rows.push(["Delta T (dtk)", num(e.delta_t, 2), ""]);
    pr("Bujur Matahari", e.sun_longitude, dms);
    pr("Bujur Bulan", e.moon_longitude, dms);
    pr("Deklinasi Bulan", e.moon_dec, dms);
    pr("Asensiorekta Bulan", e.moon_ra, ra2hms);
    pr("Tinggi Bulan", e.moon_altitude, dms);
    pr("Azimuth Bulan", e.moon_azimuth, dms);
    pr("Elongasi", e.elongation, dms);
    rows.push(["Umur Bulan", hms(e.moon_age_hours), ""]);
    rows.push(["Iluminasi (%)", num(e.illumination_pct, 3), ""]);
    rows.push(["Lebar Sabit (')", num(e.crescent_width_arcmin, 3), ""]);
    const esc = (v) => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
    return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
  }
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById("btn-txt").addEventListener("click", () => lastData && download("hilal.txt", buildText(lastData), "text/plain"));
  document.getElementById("btn-csv").addEventListener("click", () => lastData && download("hilal.csv", buildCSV(lastData), "text/csv"));

  // ---------- submit ----------
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearStatus();
    resultsEl.classList.add("hidden");
    setStatus("info", "Menghitung…");
    const fd = new FormData(form);
    let y = parseInt(fd.get("year"), 10), m = parseInt(fd.get("month"), 10), d = parseFloat(fd.get("day"));
    // Engine pakai tanggal Masehi; jika input Hijriah, konversi dulu.
    if (calMode === "hijri") {
      try {
        const r = await convertDate("h2g", y, m, Math.round(d));
        y = r.gregorian.year; m = r.gregorian.month; d = r.gregorian.day;
      } catch (_) { setStatus("error", "Gagal konversi tanggal Hijriah"); return; }
    }
    const body = {
      latitude: parseFloat(fd.get("latitude")), longitude: parseFloat(fd.get("longitude")),
      elevation: parseFloat(fd.get("elevation")), timezone: parseFloat(fd.get("timezone")),
      year: y, month: m, day: d,
    };
    try {
      const res = await fetch(window.API_BASE + "/api/alfalak/hilal", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setStatus("error", "Gagal: " + (err.error || res.status)); return; }
      const data = await res.json();
      lastData = data;
      clearStatus();
      renderVerdict(data);
      renderBasicInfo(data, body);
      renderMoonPos(data.ephemeris);
      renderSunData(data.ephemeris);
      renderSummary(data.ephemeris);
      renderMoon(data.ephemeris);
      renderEphemeris(data.ephemeris);
      renderCriteria(data.criteria, data.criteria_detailed);
      resultsEl.classList.remove("hidden");
    } catch (err) {
      setStatus("error", "Tidak bisa menghubungi backend: " + err.message);
    }
  });
})();
