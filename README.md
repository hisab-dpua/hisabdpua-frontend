# Al Falak DPUA

Aplikasi web **hisab hilal & awal bulan Kamariah** — perhitungan posisi Bulan/Matahari,
visibilitas hilal, dan penetapan awal bulan Hijriah, mengikuti metodologi Al Falak DPUA.

### 🔗 [Buka aplikasi → hisab-dpua.github.io/hisabdpua-frontend](https://hisab-dpua.github.io/hisabdpua-frontend/)

Frontend statis (GitHub Pages) yang berkomunikasi dengan backend JSON API
([`hisabdpua-gocroot`](https://github.com/hisab-dpua/hisabdpua-gocroot)) di Google Cloud Functions.

---

## Halaman & fitur

### Al Falak DPUA — Hisab Hilal (unggulan)

Ephemeris hilal lengkap untuk satu lokasi/tanggal, meniru tabel **DATA HILAL** aplikasi desktop:

- **Data ephemeris ~46 parameter**, tersusun per-section (Koordinat Ekliptika, Koreksi
  Apparent, Ekuator, Horizon, Data Hilal) — geosentrik, toposentrik, dan selisihnya.
- **Dua metode (engine)**:
  - **Classic** — algoritma Jean Meeus, sesuai metodologi Al Falak DPUA.
  - **Modern** — Astronomy-Engine (presisi tinggi).
- **9 kriteria visibilitas**: MABIMS (baru & lama), Wujudul Hilal, Odeh, Yallop, Turki,
  Danjon, LFNU, Ijtima Qabla Ghurub, dan KHGT global.
- **Diagram ufuk barat** — posisi Matahari & Bulan saat magrib (tinggi/azimuth, ARCV/DAZ).
- **Input kalibrasi**: suhu & tekanan udara untuk koreksi refraksi (default 10°C / 1010 mb).
- **Penanggalan Masehi ↔ Hijriah**, pemilih kota dari database, dan **lokasi via GPS**.
- **Ekspor**: cetak/PDF, simpan TXT/CSV, salin ringkasan, salin tautan hasil (share link).
- **Riwayat perhitungan** dan **lokasi favorit** tersimpan di perangkat.

### Peta Hilal Global

Visualisasi peta visibilitas hilal seluruh dunia per kriteria (Odeh, Yallop, MABIMS, KHGT)
dengan gradasi warna zona A–J (Leaflet).

### Hisab Awal Bulan (multi-kota)

Laporan awal bulan untuk daftar kota terkurasi dengan metode kitab:

| Metode                 | Keterangan                                    |
| ---------------------- | --------------------------------------------- |
| **Irsyadul Murid**     | Tahqīqi kontemporer — algoritma Jean Meeus    |
| **Ad-Durr al-Anīq**    | Tahqīqi-tabel — KH. Ahmad Ghozali             |
| **Maghīb al-Qamarain** | Hibrida (Meeus + tabel + taqrībi) — Ami Magib |

### Panel Admin

Dashboard ringkas, kelola pengguna (cari/filter, approve/revoke, approve massal) dan
kelola kota (cari/filter/sort, edit inline, impor/ekspor CSV).

---

## Akses

- **Hisab hilal, peta hilal, dan beranda bersifat publik** — bisa langsung dipakai tanpa login.
- Akun dibutuhkan untuk fitur tertentu (mis. menyimpan riwayat di server). Alur: daftar →
  menunggu persetujuan admin → setelah disetujui, fitur terbuka.

---

## Tampilan

- Tema **terang (krem)** & **gelap (langit malam)** dengan toggle, palet kustom
  (krem `#F0ECDD` → navy `#02122F`).
- Efek visual: glass-panel (kartu kaca), latar bintang berkelip, animasi halus —
  menghormati `prefers-reduced-motion`.
- Responsif (mobile/desktop), preview tautan rapi (Open Graph / Twitter Card).

---

## Teknologi

- HTML + Tailwind (CDN) + **daisyUI** v4, JavaScript vanilla (tanpa build step).
- Peta: **Leaflet**. Ikon: Heroicons (inline SVG).
- Auth: token **PASETO** disimpan di `localStorage`, dikirim sebagai
  `Authorization: Bearer`.

### Struktur

```
.
├─ index.html              Beranda
├─ alfalak-hilal.html      Hisab Hilal (Al Falak DPUA)
├─ alfalak-map.html        Peta Hilal Global
├─ hisab.html              Hisab awal bulan multi-kota
├─ maghib.html             Maghīb al-Qamarain
├─ admin.html              Panel admin
├─ login.html / register.html / pending-approval.html
└─ assets/
   ├─ config.js            window.API_BASE (dev vs produksi)
   ├─ app.js               fetchAPI / fetchMe / auth
   ├─ ui.js                navbar bersama, toast, modal, PDF, star-field, dll.
   ├─ theme.js / theme.css Tema terang/gelap (override OKLCH daisyUI)
   └─ *.js                 Skrip per-halaman
```

### Konfigurasi backend

`window.API_BASE` di `assets/config.js` menentukan URL backend (otomatis memilih
localhost saat dev, atau URL Cloud Functions saat produksi).

---

## Pengembangan lokal

```bash
# Sajikan statis (mis. dengan Python)
python3 -m http.server 8088
# → http://localhost:8088

# Backend lokal: jalankan hisabdpua-gocroot di :8080 (lihat repo backend),
# atau gunakan endpoint Al Falak publik tanpa DB.
```

Deploy otomatis ke GitHub Pages via Actions (`.github/workflows/main.yml`) saat push ke `main`.
