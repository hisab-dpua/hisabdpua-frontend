// history.js — load + render daftar riwayat hisab user.

(async function () {
  const $ = (sel) => document.querySelector(sel);
  const status = $("#status");
  const monthIDN = ["", "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
    "Jumadil Awal", "Jumadil Akhir", "Rajab", "Syakban", "Ramadan",
    "Syawal", "Zulkaidah", "Zulhijah"];

  // Greet.
  try {
    const meRes = await fetchAPI("/me");
    if (meRes.ok) {
      const me = await meRes.json();
      $("#user-greet").textContent = `👤 ${me.name}`;
    }
  } catch {}

  status.textContent = "Memuat riwayat…";
  let data;
  try {
    const res = await fetchAPI("/api/history");
    data = await res.json();
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    return;
  }

  $("#history-json").textContent = JSON.stringify(data, null, 2);
  status.textContent = `${data.count} entri.`;

  if (!data.entries || data.entries.length === 0) {
    $("#empty").classList.remove("hidden");
    return;
  }
  $("#table-wrap").classList.remove("hidden");

  const tbody = $("#history-body");
  tbody.innerHTML = "";
  for (const e of data.entries) {
    const tr = document.createElement("tr");
    const savedFmt = new Date(e.saved_at).toLocaleString("id-ID");
    tr.innerHTML = `
      <td class="whitespace-nowrap">${savedFmt}</td>
      <td>${monthIDN[e.month]} ${e.year} H</td>
      <td>${e.city_name || `${e.lat.toFixed(2)}, ${e.lon.toFixed(2)}`}</td>
      <td>
        <div>${e.result.ijtima.im.time_local} WIB</div>
        <div class="text-xs">${e.result.day_rukyat.im.altitude_center}</div>
      </td>
      <td>
        <div>${e.result.ijtima.aniq.time_local} WIB</div>
        <div class="text-xs">${e.result.day_rukyat.aniq.altitude_center}</div>
      </td>
      <td>
        <button class="btn btn-error btn-xs" data-id="${e.id}">Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.addEventListener("click", async (ev) => {
    const btn = ev.target.closest("button[data-id]");
    if (!btn) return;
    if (!confirm("Hapus entri ini?")) return;
    btn.disabled = true;
    try {
      const res = await fetchAPI(`/api/history/${btn.dataset.id}`, { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        alert(`Gagal hapus: ${e.error || res.statusText}`);
        btn.disabled = false;
        return;
      }
      btn.closest("tr").remove();
    } catch (err) {
      alert(`Error: ${err.message}`);
      btn.disabled = false;
    }
  });
})();
