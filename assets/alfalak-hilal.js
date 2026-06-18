// alfalak-hilal.js — panggil /api/alfalak/hilal, tampilkan data LENGKAP:
// ringkasan, visualisasi sabit, tabel ephemeris penuh (geo/topo), kriteria detail,
// export TXT/CSV/print, pemilih kota, kalender Hijriah↔Masehi. Setara desktop.
// Halaman publik; navbar di-mount graceful.
(async function () {
  mountNav("alfalak", await fetchMe());

  const form = document.getElementById("alfalak-hilal-form");
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  let lastData = null;     // hilal response (export)
  let lastDetailed = null; // detailed ephemeris (tabel lengkap)
  let engineMode = "classic"; // classic | modern

  // ===== Pemilih kota dari database (GET /api/cities) — bisa di-CRUD admin =====
  const cityMap = {}; // "Nama — Negara" → {name,country,lat,lon,tz,elevation,temperature,pressure}
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
    // Suhu & tekanan dari data kota (rata-rata iklim + barometrik dari elevasi);
    // bila kota belum punya, biarkan nilai default di form.
    if (form.temperature && c.temperature > 0) form.temperature.value = c.temperature;
    if (form.pressure && c.pressure > 0) form.pressure.value = c.pressure;
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

  // ===== Toggle metode hitung Classic ↔ Modern =====
  const btnEngClassic = document.getElementById("eng-classic");
  const btnEngModern = document.getElementById("eng-modern");
  function setEngine(mode) {
    if (engineMode === mode) return;
    engineMode = mode;
    if (btnEngClassic) btnEngClassic.classList.toggle("btn-active", mode === "classic");
    if (btnEngModern) btnEngModern.classList.toggle("btn-active", mode === "modern");
    if (lastData) form.requestSubmit(); // hitung ulang dengan metode baru
  }
  if (btnEngClassic) btnEngClassic.addEventListener("click", () => setEngine("classic"));
  if (btnEngModern) btnEngModern.addEventListener("click", () => setEngine("modern"));

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

  // ---------- diagram ufuk (Matahari & Bulan saat magrib) ----------
  // Memakai DetailedEphemeris (azimuth & tinggi toposentrik tampak). Sumbu-x:
  // azimuth (°), dipusatkan di rata-rata; sumbu-y: tinggi (°). Garis ufuk di 0°.
  function renderHorizon(d) {
    const host = document.getElementById("horizon-viz");
    const cap = document.getElementById("horizon-caption");
    if (!host) return;
    if (!d) { host.innerHTML = ""; if (cap) cap.textContent = ""; return; }
    const sunAz = d.sun_azimuth_apparent_airless_topo ?? d.sun_azimuth_airless_topo;
    const moonAz = d.moon_azimuth_apparent_airless_topo ?? d.moon_azimuth_airless_topo;
    const sunAlt = d.sun_altitude_apparent_airless_topo ?? d.sun_altitude_airless_topo;
    const moonAlt = d.moon_altitude_airy_topo ?? d.moon_altitude_apparent_airless_topo;
    if ([sunAz, moonAz, sunAlt, moonAlt].some((v) => v == null || isNaN(v))) { host.innerHTML = ""; return; }

    const W = 560, H = 260, padL = 44, padR = 16, padT = 14, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    // rentang azimuth: ±4° di sekitar titik tengah Matahari/Bulan
    const azMid = (sunAz + moonAz) / 2;
    const azHalf = Math.max(2.2, Math.abs(sunAz - moonAz) / 2 + 1.5);
    const azMin = azMid - azHalf, azMax = azMid + azHalf;
    // rentang tinggi: dari sedikit di bawah min sampai +5°
    const altLo = Math.min(-2, sunAlt, moonAlt) - 1;
    const altHi = Math.max(5, sunAlt, moonAlt) + 1;
    const X = (az) => padL + ((az - azMin) / (azMax - azMin)) * plotW;
    const Y = (alt) => padT + (1 - (alt - altLo) / (altHi - altLo)) * plotH;

    // grid tinggi tiap 1°
    let grid = "";
    for (let a = Math.ceil(altLo); a <= Math.floor(altHi); a++) {
      const yy = Y(a);
      const horizon = a === 0;
      grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="${horizon ? "#0ea5e9" : "#e5e7eb"}" stroke-width="${horizon ? 1.6 : 0.7}"/>`;
      grid += `<text x="${padL - 6}" y="${yy + 3}" text-anchor="end" font-size="9" fill="#94a3b8">${a}°</text>`;
    }
    // grid azimuth tiap 1°
    for (let a = Math.ceil(azMin); a <= Math.floor(azMax); a++) {
      const xx = X(a);
      grid += `<line x1="${xx}" y1="${padT}" x2="${xx}" y2="${H - padB}" stroke="#f1f5f9" stroke-width="0.7"/>`;
      grid += `<text x="${xx}" y="${H - padB + 12}" text-anchor="middle" font-size="9" fill="#94a3b8">${a}°</text>`;
    }

    const sdMoon = (d.moon_semidiameter_deg || 0.25);
    const sx = X(sunAz), sy = Y(sunAlt), mx = X(moonAz), my = Y(moonAlt);
    const rMoonPx = Math.max(4, Math.abs(Y(moonAlt) - Y(moonAlt + sdMoon)));

    const svg = `
    <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="min-width:420px">
      <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="#fafafa"/>
      ${grid}
      <!-- area di bawah ufuk -->
      <rect x="${padL}" y="${Y(0)}" width="${plotW}" height="${Math.max(0, H - padB - Y(0))}" fill="#0ea5e9" opacity="0.06"/>
      <!-- Matahari -->
      <circle cx="${sx}" cy="${sy}" r="7" fill="#f59e0b" stroke="#b45309"/>
      <text x="${sx}" y="${sy - 10}" text-anchor="middle" font-size="10" fill="#b45309">Matahari</text>
      <!-- Bulan -->
      <circle cx="${mx}" cy="${my}" r="${rMoonPx}" fill="#e2e8f0" stroke="#64748b"/>
      <text x="${mx}" y="${my - rMoonPx - 4}" text-anchor="middle" font-size="10" fill="#475569">Bulan</text>
      <text x="${(padL + W - padR) / 2}" y="${H - 4}" text-anchor="middle" font-size="9" fill="#94a3b8">Azimuth (° dari Utara) — ufuk barat</text>
    </svg>`;
    host.innerHTML = svg;
    if (cap) cap.innerHTML =
      `Matahari: tinggi ${dms(sunAlt)}, azimuth ${dms(sunAz)} · Bulan: tinggi ${dms(moonAlt)}, azimuth ${dms(moonAz)} · ` +
      `beda tinggi (ARCV) ${dms(moonAlt - sunAlt)}, beda azimuth (DAZ) ${dms(moonAz - sunAz)}.`;
  }

  // ---------- tabel ephemeris penuh ----------
  function gt(row, fmt) { return [fmt(row.geo), fmt(row.topo)]; }
  function gt(row, fmt) { return [fmt(row.geo), fmt(row.topo)]; }
  // Tabel DATA HILAL lengkap (meniru Al Falak DPUA) — konsumsi DetailedEphemeris.
  function diffDMS(g, t) { return (g == null || t == null || isNaN(g) || isNaN(t)) ? "" : dms(t - g); }
  function diffHMSra(g, t) { return (g == null || t == null) ? "" : ra2hms(t - g); }

  // Ikon SVG kecil untuk banner section (Heroicons/feather, stroke=currentColor).
  const EPH_ICONS = {
    ekliptika: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    koreksi: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    ekuator: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="10" ry="4"/></svg>',
    horizon: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="16" x2="22" y2="16"/><circle cx="8" cy="11" r="3"/><circle cx="16" cy="13" r="2"/></svg>',
    hilal: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };

  function renderEphemeris(e) {
    // Tiap section = objek {title, icon, hint, rows}. Tiap baris:
    //   ["A", no, label, geoNum, topoNum]      → sudut (DMS) + selisih
    //   ["R", no, label, geoDeg, topoDeg]      → RA (HMS) + selisih
    //   ["S", no, label, valStr]               → nilai tunggal
    //   ["P", no, label, geoStr, topoStr, sel] → string siap pakai (+selisih)
    const sections = [
      { title: "Koordinat Ekliptika", icon: EPH_ICONS.ekliptika, key: "ekliptika", rows: [
        ["P", "1", "Ijtima' (Konjungsi)", e.conjunction_date || "—", e.conjunction_date_topo || "—", e.conjunction_diff || ""],
        ["A", "2", "Semidiameter Matahari", e.sun_semidiameter_deg, e.sun_semidiameter_deg],
        ["A", "3", "Semidiameter Bulan", e.moon_semidiameter_deg, e.moon_semidiameter_deg],
        ["A", "4", "Bujur Ekliptika Matahari", e.sun_longitude_geo, e.sun_longitude_topo],
        ["A", "5", "Lintang Ekliptika Matahari", e.sun_latitude_geo, e.sun_latitude_topo],
        ["A", "6", "Bujur Ekliptika Bulan", e.moon_longitude_geo, e.moon_longitude_topo],
        ["A", "7", "Lintang Ekliptika Bulan", e.moon_latitude_geo, e.moon_latitude_topo],
      ]},
      { title: "Koreksi Apparent", icon: EPH_ICONS.koreksi, key: "koreksi", rows: [
        ["S", "8a", "Nutasi Sepanjang Bujur", num(e.nutation_longitude * 3600, 2) + '"'],
        ["S", "8b", "Nutasi Kemiringan Ekliptika", num(e.nutation_obliquity * 3600, 2) + '"'],
        ["S", "8c", "Aberasi Matahari", num(e.sun_aberration * 3600, 2) + '"'],
        ["A", "9", "Bujur Ekliptika Matahari (Tampak)", e.sun_longitude_apparent_geo, e.sun_longitude_apparent_topo],
        ["A", "10", "Lintang Ekliptika Matahari (Tampak)", e.sun_latitude_apparent_geo, e.sun_latitude_apparent_topo],
        ["A", "11", "Bujur Ekliptika Bulan (Tampak)", e.moon_longitude_apparent_geo, e.moon_longitude_apparent_topo],
        ["A", "12", "Lintang Ekliptika Bulan (Tampak)", e.moon_latitude_apparent_geo, e.moon_latitude_apparent_topo],
      ]},
      { title: "Koordinat Ekuator", icon: EPH_ICONS.ekuator, key: "ekuator", rows: [
        ["A", "13", "Deklinasi Matahari", e.sun_dec_geo, e.sun_dec_topo],
        ["R", "14", "Asensiorekta Matahari", e.sun_ra_geo, e.sun_ra_topo],
        ["A", "15", "Deklinasi Bulan", e.moon_dec_geo, e.moon_dec_topo],
        ["R", "16", "Asensiorekta Bulan", e.moon_ra_geo, e.moon_ra_topo],
        ["A", "17", "Deklinasi Matahari (Tampak)", e.sun_dec_apparent_geo, e.sun_dec_apparent_topo],
        ["R", "18", "Asensiorekta Matahari (Tampak)", e.sun_ra_apparent_geo, e.sun_ra_apparent_topo],
        ["A", "19", "Deklinasi Bulan (Tampak)", e.moon_dec_apparent_geo, e.moon_dec_apparent_topo],
        ["R", "20", "Asensiorekta Bulan (Tampak)", e.moon_ra_apparent_geo, e.moon_ra_apparent_topo],
      ]},
      { title: "Koordinat Horizon", icon: EPH_ICONS.horizon, key: "horizon", rows: [
        ["A", "21", "Tinggi Matahari", e.sun_altitude_airless_geo, e.sun_altitude_airless_topo],
        ["A", "22", "Azimuth Matahari", e.sun_azimuth_airless_geo, e.sun_azimuth_airless_topo],
        ["A", "23", "Tinggi Bulan", e.moon_altitude_airless_geo, e.moon_altitude_airless_topo],
        ["A", "24", "Azimuth Bulan", e.moon_azimuth_airless_geo, e.moon_azimuth_airless_topo],
        ["A", "25", "Tinggi Matahari (Tampak)", e.sun_altitude_apparent_airless_geo, e.sun_altitude_apparent_airless_topo],
        ["A", "26", "Azimuth Matahari (Tampak)", e.sun_azimuth_apparent_airless_geo, e.sun_azimuth_apparent_airless_topo],
        ["A", "27", "Tinggi Bulan (Tampak)", e.moon_altitude_apparent_airless_geo, e.moon_altitude_apparent_airless_topo],
        ["A", "28", "Azimuth Bulan (Tampak)", e.moon_azimuth_apparent_airless_geo, e.moon_azimuth_apparent_airless_topo],
        ["A", "29", "Tinggi Matahari (Airy/refraksi)", e.sun_altitude_airy_geo, e.sun_altitude_airy_topo],
        ["S", "30", "Koreksi Refraksi Matahari", dms(e.sun_refraction)],
        ["A", "31", "Tinggi Bulan (Airy/refraksi)", e.moon_altitude_airy_geo, e.moon_altitude_airy_topo],
        ["S", "32", "Koreksi Refraksi Bulan", dms(e.moon_refraction)],
        ["S", "33", "Horizontal Parallax Matahari", dms(e.sun_horizontal_parallax)],
        ["S", "34", "Horizontal Parallax Bulan", dms(e.moon_horizontal_parallax)],
      ]},
      { title: "Data Bulan (Hilal)", icon: EPH_ICONS.hilal, key: "hilal", rows: [
        ["P", "35", "Umur Bulan", hms(e.moon_age_hours_geo), hms(e.moon_age_hours_topo), ""],
        ["A", "36", "Elongasi", e.elongation_geo, e.elongation_topo],
        ["P", "37", "Kecerlangan (Iluminasi)", num(e.illumination_geo, 2) + "%", num(e.illumination_topo, 2) + "%", ""],
        ["P", "38", "Lebar Sabit", num(e.crescent_width_geo, 2) + "'", num(e.crescent_width_topo, 2) + "'", ""],
        ["A", "39", "Tinggi Piringan Atas", e.upper_limb_altitude_geo, e.upper_limb_altitude_topo],
        ["A", "40", "Tinggi Pusat Piringan", e.center_altitude_geo, e.center_altitude_topo],
        ["A", "41", "Tinggi Piringan Bawah", e.lower_limb_altitude_geo, e.lower_limb_altitude_topo],
        ["A", "42", "Tinggi Relatif", e.relative_altitude_geo, e.relative_altitude_topo],
        ["A", "43", "Azimuth Relatif", e.relative_azimuth_geo, e.relative_azimuth_topo],
        ["A", "44", "Sudut Fase", e.phase_angle_geo, e.phase_angle_topo],
        ["P", "45", "Arah Hilal", e.arah_hilal_geo || "—", e.arah_hilal_topo || "—", ""],
        ["P", "46", "Kedudukan Hilal", e.kedudukan_hilal_geo || "—", e.kedudukan_hilal_topo || "—", ""],
      ]},
    ];

    const cell = (v) => `<td class="text-right font-mono">${v}</td>`;
    const rowHTML = (r) => {
      const tag = r[0], no = r[1], label = r[2];
      let g = "", t = "", sel = "";
      if (tag === "A") { g = dms(r[3]); t = dms(r[4]); sel = diffDMS(r[3], r[4]); }
      else if (tag === "R") { g = ra2hms(r[3]); t = ra2hms(r[4]); sel = diffHMSra(r[3], r[4]); }
      else if (tag === "S") { g = r[3]; }
      else if (tag === "P") { g = r[3]; t = r[4]; sel = r[5] || ""; }
      return `<tr>
        <td class="text-base-content/40 w-8">${no}</td>
        <td class="font-medium">${label}</td>
        ${cell(g)}${cell(t)}
        <td class="text-right font-mono text-base-content/60">${sel}</td>
      </tr>`;
    };

    const sectionHTML = (s) => `
      <div class="card glass-panel border border-base-300/60 overflow-hidden">
        <div class="px-4 py-2.5 font-bold text-sm uppercase tracking-wide flex items-center gap-2 border-b border-base-300/60 bg-base-300/40 text-primary">
          ${s.icon}<span>${s.title}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-sm w-full">
            <thead><tr class="text-xs">
              <th class="w-8">No</th><th>Parameter</th>
              <th class="text-right">Geosentrik</th>
              <th class="text-right">Toposentrik</th>
              <th class="text-right">Selisih</th>
            </tr></thead>
            <tbody>${s.rows.map(rowHTML).join("")}</tbody>
          </table>
        </div>
      </div>`;

    const host = document.getElementById("ephemeris-sections");
    if (host) host.innerHTML = sections.map(sectionHTML).join("");

    const badge = document.getElementById("eph-engine-badge");
    if (badge) badge.textContent = e.engine || "";
    const notes = document.getElementById("eph-notes");
    if (notes) {
      const parts = [];
      if (e.semidiameter_note) parts.push("• " + e.semidiameter_note);
      if (e.altitude_note) parts.push("• " + e.altitude_note);
      if (e.ephemeris_note) parts.push("• " + e.ephemeris_note);
      notes.innerHTML = parts.map((p) => `<span class="block">${p}</span>`).join("");
    }
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
      temperature: parseFloat(fd.get("temperature")) || 0,
      pressure: parseFloat(fd.get("pressure")) || 0,
    };
    const post = (path, b) => fetch(window.API_BASE + path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b),
    });
    try {
      // hilal → ringkasan/kriteria ; ephemeris → tabel detail lengkap (per engine)
      const [res, ephRes] = await Promise.all([
        post("/api/alfalak/hilal", body),
        post("/api/alfalak/ephemeris", { ...body, engine: engineMode }),
      ]);
      if (!res.ok) { const err = await res.json().catch(() => ({})); setStatus("error", "Gagal: " + (err.error || res.status)); return; }
      const data = await res.json();
      lastData = data;
      lastDetailed = ephRes.ok ? (await ephRes.json()).ephemeris : null;
      clearStatus();
      renderVerdict(data);
      renderBasicInfo(data, body);
      renderMoonPos(data.ephemeris);
      renderSunData(data.ephemeris);
      renderSummary(data.ephemeris);
      renderMoon(data.ephemeris);
      if (lastDetailed) renderEphemeris(lastDetailed);
      renderHorizon(lastDetailed);
      renderCriteria(data.criteria, data.criteria_detailed);
      resultsEl.classList.remove("hidden");
      saveHistory(fd, body);
    } catch (err) {
      setStatus("error", "Tidak bisa menghubungi backend: " + err.message);
    }
  });

  // ═══════════════════ Lokasi: GPS, favorit, riwayat ═══════════════════
  const favStore = window.lsList("alfalak_fav_locations", 30);
  const histStore = window.lsList("alfalak_hilal_history", 20);

  function fillLocation({ name, country, lat, lon, tz, elevation }) {
    if (name != null) form.loc_name.value = name;
    if (country != null) form.country.value = country;
    if (lat != null) form.latitude.value = lat;
    if (lon != null) form.longitude.value = lon;
    if (tz != null) form.timezone.value = tz;
    if (elevation != null) form.elevation.value = elevation;
  }

  // GPS
  const btnGPS = document.getElementById("btn-gps");
  if (btnGPS) btnGPS.addEventListener("click", async () => {
    setLoading(btnGPS, true);
    try {
      const { lat, lon } = await window.getGeolocation();
      form.latitude.value = lat.toFixed(4);
      form.longitude.value = lon.toFixed(4);
      // estimasi zona waktu dari bujur (pembulatan 15°/jam) bila kosong
      if (!form.timezone.value) form.timezone.value = Math.round(lon / 15);
      window.toast("Lokasi perangkat terisi", "success");
    } catch (e) {
      window.toast("Tidak bisa ambil lokasi: " + (e.message || "ditolak"), "error");
    } finally { setLoading(btnGPS, false); }
  });

  // Favorit: simpan + pilih
  const favSelect = document.getElementById("fav-select");
  function renderFavorites() {
    const favs = favStore.all();
    if (!favSelect) return;
    favSelect.classList.toggle("hidden", favs.length === 0);
    favSelect.innerHTML = '<option value="">★ Lokasi favorit…</option>' +
      favs.map((f, i) => `<option value="${i}">${(f.name || "Tanpa nama")} (${(+f.lat).toFixed(2)}, ${(+f.lon).toFixed(2)})</option>`).join("");
  }
  if (favSelect) favSelect.addEventListener("change", () => {
    const i = parseInt(favSelect.value, 10);
    if (isNaN(i)) return;
    fillLocation(favStore.all()[i]);
    favSelect.value = "";
    window.toast("Lokasi favorit dimuat", "info");
  });
  const btnFavSave = document.getElementById("btn-fav-save");
  if (btnFavSave) btnFavSave.addEventListener("click", () => {
    const fd = new FormData(form);
    const lat = parseFloat(fd.get("latitude")), lon = parseFloat(fd.get("longitude"));
    if (isNaN(lat) || isNaN(lon)) { window.toast("Isi lintang & bujur dulu", "warning"); return; }
    const fav = {
      name: (fd.get("loc_name") || "").trim() || `(${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      country: (fd.get("country") || "").trim(),
      lat, lon, tz: parseFloat(fd.get("timezone")) || 0, elevation: parseFloat(fd.get("elevation")) || 0,
    };
    favStore.add(fav, "name");
    renderFavorites();
    window.toast(`Favorit disimpan: ${fav.name}`, "success");
  });

  // Riwayat
  function saveHistory(fd, body) {
    const item = {
      ts: new Date().toISOString(),
      name: (fd.get("loc_name") || "").trim() || `(${body.latitude.toFixed(2)}, ${body.longitude.toFixed(2)})`,
      lat: body.latitude, lon: body.longitude, tz: body.timezone, elevation: body.elevation,
      temperature: body.temperature, pressure: body.pressure,
      year: body.year, month: body.month, day: body.day, engine: engineMode,
    };
    histStore.add(item);
    renderHistory();
  }
  function renderHistory() {
    const list = histStore.all();
    const card = document.getElementById("history-card");
    const host = document.getElementById("history-list");
    if (!card || !host) return;
    card.classList.toggle("hidden", list.length === 0);
    host.innerHTML = list.map((h, i) =>
      `<button type="button" class="btn btn-xs btn-outline" data-hi="${i}" title="${new Date(h.ts).toLocaleString("id-ID")}">${h.name} · ${h.day}/${h.month}/${h.year}</button>`).join("");
    host.querySelectorAll("button[data-hi]").forEach((b) => b.addEventListener("click", () => {
      const h = histStore.all()[parseInt(b.dataset.hi, 10)];
      if (!h) return;
      fillLocation(h);
      form.year.value = h.year; form.month.value = h.month; form.day.value = Math.round(h.day);
      if (form.temperature) form.temperature.value = h.temperature || 10;
      if (form.pressure) form.pressure.value = h.pressure || 1010;
      if (h.engine && typeof setEngine === "function") setEngine(h.engine);
      // pastikan mode Masehi
      if (calMode === "hijri" && btnGreg) btnGreg.click();
      form.requestSubmit();
    }));
  }
  const histClear = document.getElementById("history-clear");
  if (histClear) histClear.addEventListener("click", async () => {
    const ok = await window.confirmDialog({ title: "Hapus riwayat?", body: "Hapus semua riwayat perhitungan di perangkat ini?", confirmLabel: "Hapus", danger: true });
    if (ok) { histStore.clear(); renderHistory(); window.toast("Riwayat dihapus", "info"); }
  });

  renderFavorites();
  renderHistory();

  // ═══════════════════ Ekspor PDF, salin, tautan ═══════════════════
  const btnPDF = document.getElementById("btn-pdf");
  if (btnPDF) btnPDF.addEventListener("click", () => {
    if (!lastData) return;
    const L = lastData.location, D = lastData.date;
    const engine = (lastDetailed && lastDetailed.engine) || "Classic (Meeus)";
    // Kumpulkan tiap section (banner judul + tabelnya) untuk PDF.
    const host = document.getElementById("ephemeris-sections");
    let body = "";
    if (host) host.querySelectorAll(".card").forEach((card) => {
      const title = (card.querySelector(".font-bold span") || {}).textContent || "";
      const tbl = card.querySelector("table");
      body += `<h2 style="font-size:13px;margin:10px 0 4px;border-bottom:2px solid #495b7d;padding-bottom:2px">${title}</h2>` +
        (tbl ? tbl.outerHTML : "");
    });
    const html = `
      <h1 style="font-size:18px">DATA HILAL — Al Falak DPUA</h1>
      <p style="font-size:12px;margin:2px 0">Lokasi: ${escapeHtml(form.loc_name.value || "")} (${L.latitude}, ${L.longitude}) · elev ${L.elevation} m · UTC${L.timezone >= 0 ? "+" : ""}${L.timezone}</p>
      <p style="font-size:12px;margin:2px 0">Tanggal: ${D.day}/${D.month}/${D.year} · Metode: ${engine}</p>
      ${body}`;
    window.printArea(html, "DATA HILAL");
  });

  const btnCopy = document.getElementById("btn-copy");
  if (btnCopy) btnCopy.addEventListener("click", () => {
    if (!lastData) return;
    window.copyToClipboard(buildText(lastData), "Ringkasan disalin");
  });

  const btnShare = document.getElementById("btn-share");
  if (btnShare) btnShare.addEventListener("click", () => {
    const fd = new FormData(form);
    const p = new URLSearchParams({
      lat: fd.get("latitude"), lon: fd.get("longitude"), elev: fd.get("elevation"),
      tz: fd.get("timezone"), y: fd.get("year"), m: fd.get("month"), d: fd.get("day"),
      name: fd.get("loc_name") || "", engine: engineMode,
    });
    const url = location.origin + location.pathname + "?" + p.toString();
    window.copyToClipboard(url, "Tautan hasil disalin");
  });

  function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // ═══════════════════ Muat dari URL (share link) ═══════════════════
  (function loadFromURL() {
    const q = new URLSearchParams(location.search);
    if (!q.has("lat") || !q.has("lon")) return;
    fillLocation({
      name: q.get("name") || "", lat: q.get("lat"), lon: q.get("lon"),
      tz: q.get("tz"), elevation: q.get("elev"),
    });
    if (q.get("y")) form.year.value = q.get("y");
    if (q.get("m")) form.month.value = q.get("m");
    if (q.get("d")) form.day.value = q.get("d");
    if (q.get("engine") && typeof setEngine === "function") setEngine(q.get("engine"));
    setTimeout(() => form.requestSubmit(), 100);
  })();
})();
