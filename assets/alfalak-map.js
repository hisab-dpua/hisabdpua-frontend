// alfalak-map.js — fetch /api/alfalak/map grid, gambar zona A–J di Leaflet via canvas.
// Halaman publik; navbar di-mount graceful.
(async function () {
  try {
    const meRes = await fetchAPI("/me");
    mountNav("alfalak-map", meRes.ok ? await meRes.json() : null);
  } catch (_) {
    mountNav("alfalak-map", null);
  }

  // Warna zona A–J — sama dengan desktop (map/color.rs VisibilityColors).
  const ZONE = {
    A: { rgb: [62, 255, 0], label: "A — Mudah terlihat mata telanjang" },
    B: { rgb: [109, 255, 62], label: "B — Terlihat (kondisi sempurna)" },
    C: { rgb: [158, 255, 0], label: "C — Perlu alat bantu" },
    D: { rgb: [250, 255, 0], label: "D — Perlu alat bantu (sulit)" },
    E: { rgb: [255, 120, 60], label: "E — Tidak terlihat dgn teleskop" },
    F: { rgb: [255, 255, 255], label: "F — Tidak terlihat", alpha: 0 },
    G: { rgb: [106, 13, 173], label: "G — Magrib sebelum ijtimak" },
    H: { rgb: [255, 255, 255], label: "H — Tak ada terbit/terbenam", alpha: 0 },
    I: { rgb: [255, 0, 0], label: "I — Bulan terbenam sebelum matahari" },
    J: { rgb: [181, 7, 87], label: "J — Kombinasi G+I" },
  };

  const statusEl = document.getElementById("status");
  function setStatus(kind, msg) {
    statusEl.className = "alert alert-" + kind;
    statusEl.textContent = msg;
    statusEl.classList.remove("hidden");
  }
  function clearStatus() { statusEl.classList.add("hidden"); }

  // Legenda.
  const legend = document.getElementById("legend");
  for (const k of Object.keys(ZONE)) {
    const z = ZONE[k];
    const chip = document.createElement("div");
    chip.className = "flex items-center gap-1 border rounded px-2 py-1";
    const sw = z.alpha === 0 ? "#fff" : "rgb(" + z.rgb.join(",") + ")";
    chip.innerHTML =
      '<span style="width:12px;height:12px;background:' + sw +
      ';border:1px solid #999;display:inline-block"></span>' +
      "<span>" + z.label + "</span>";
    legend.appendChild(chip);
  }

  const map = L.map("map", { worldCopyJump: false, minZoom: 1 }).setView([10, 100], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap", noWrap: true,
  }).addTo(map);

  let overlay = null;

  // Custom canvas overlay menggambar grid zona.
  function drawGrid(grid) {
    if (overlay) { map.removeLayer(overlay); overlay = null; }

    const { rows, cols, deg_per_cell, lon_min, lat_max, codes } = grid;
    const bounds = L.latLngBounds(
      [grid.lat_min, lon_min],
      [lat_max, lon_min + cols * deg_per_cell]
    );

    const CanvasOverlay = L.Layer.extend({
      onAdd: function (m) {
        this._canvas = L.DomUtil.create("canvas", "leaflet-zindex");
        this._canvas.style.position = "absolute";
        m.getPanes().overlayPane.appendChild(this._canvas);
        m.on("moveend zoomend resize", this._reset, this);
        this._reset();
      },
      onRemove: function (m) {
        L.DomUtil.remove(this._canvas);
        m.off("moveend zoomend resize", this._reset, this);
      },
      _reset: function () {
        const m = this._map;
        const topLeft = m.latLngToLayerPoint(bounds.getNorthWest());
        const bottomRight = m.latLngToLayerPoint(bounds.getSouthEast());
        const w = bottomRight.x - topLeft.x;
        const h = bottomRight.y - topLeft.y;
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._canvas.width = Math.max(1, Math.round(w));
        this._canvas.height = Math.max(1, Math.round(h));

        const ctx = this._canvas.getContext("2d");
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        const cw = this._canvas.width / cols;
        const ch = this._canvas.height / rows;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const code = codes[r * cols + c];
            const z = ZONE[code] || ZONE.F;
            if (z.alpha === 0) continue; // transparan
            ctx.fillStyle = "rgba(" + z.rgb.join(",") + ",0.55)";
            ctx.fillRect(c * cw, r * ch, Math.ceil(cw), Math.ceil(ch));
          }
        }
      },
    });
    overlay = new CanvasOverlay();
    overlay.addTo(map);
  }

  document.getElementById("alfalak-map-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    clearStatus();
    setStatus("info", "Menghitung peta… (mungkin beberapa detik)");
    const fd = new FormData(e.target);
    const body = {
      year: parseInt(fd.get("year"), 10),
      month: parseInt(fd.get("month"), 10),
      day: parseFloat(fd.get("day")),
      criterion: fd.get("criterion"),
      is_evening: true,
      deg_per_cell: 2.0,
    };
    try {
      const res = await fetch(window.API_BASE + "/api/alfalak/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus("error", "Gagal: " + (err.error || res.status));
        return;
      }
      const grid = await res.json();
      clearStatus();
      drawGrid(grid);
    } catch (err) {
      setStatus("error", "Tidak bisa menghubungi backend: " + err.message);
    }
  });
})();
