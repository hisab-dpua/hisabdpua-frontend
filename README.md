# Hisab DPUA — Frontend

Static frontend (HTML + Tailwind + DaisyUI) untuk webapp **Hisab Awal Bulan Kamariah** (metode Irsyadul Murid & Ad-Durr Al-Anīq). Dipakai bareng backend Go-GCF di repo [`hisabdpua-gocroot`](https://github.com/hisab-dpua/hisabdpua-gocroot).

Pola arsitektur mengikuti [webapp-gocroot](https://github.com/rumahpublikasi/slr-gocroot): frontend static di GitHub Pages, backend pure JSON di Google Cloud Functions.

## Halaman

| File | Akses | Keterangan |
|---|---|---|
| [`index.html`](index.html) | publik | Landing page |
| [`register.html`](register.html) | publik | Daftar akun (auto pending) |
| [`login.html`](login.html) | publik | Login |
| [`pending-approval.html`](pending-approval.html) | login required | Tampil saat akun belum di-approve admin |
| [`hisab.html`](hisab.html) | approved | Laporan multi-kota satu metode |
| [`compare.html`](compare.html) | approved | Sanding 2 metode untuk 1 kota |
| [`history.html`](history.html) | approved | Riwayat hisab tersimpan per user |
| [`admin.html`](admin.html) | admin | Approve user + CRUD kota |

## Konfigurasi backend URL

Edit [`assets/config.js`](assets/config.js):

```js
window.API_BASE = "http://localhost:8090";  // dev
// production:
window.API_BASE = "https://hisabdpua-gocroot-XXXX.run.app";
```

Auto-detect: hostname `localhost` / `127.0.0.1` → dev backend. Lainnya → prod URL.

## Auth flow

1. Login/register → backend return JSON `{token, redirect, user}`.
2. Token PASETO disimpan di `localStorage["hisab_token"]`.
3. Semua call API kirim header `Authorization: Bearer <token>`.
4. 401 → clear token → redirect `login.html`.
5. 403 + `body.redirect = "/pending-approval"` → redirect `pending-approval.html`.

Lihat [`assets/app.js`](assets/app.js).

## Local development

Frontend butuh disajikan dari HTTP server (bukan file://) karena `fetch` cross-origin.

```bash
# 1) Backend di repo hisabdpua-gocroot (port 8090):
cd ../hisabdpua-gocroot
go run ./run

# 2) Frontend di repo ini (port 5173, match CORS whitelist backend):
python3 -m http.server 5173

# Buka http://localhost:5173/index.html
```

`localhost:5173` sudah ter-whitelist di `config/cors.go` backend, jadi tidak perlu setup CORS tambahan saat dev.

## Deploy ke GitHub Pages

1. Push repo ini ke GitHub (`hisab-dpua/hisabdpua-frontend`).
2. Buka **Settings → Pages**.
3. Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Tunggu publish; URL akan jadi `https://hisab-dpua.github.io/hisabdpua-frontend/`.
5. Edit [`assets/config.js`](assets/config.js) → set `API_BASE` ke URL backend GCF, push.
6. Pastikan backend `config/cors.go` whitelist origin Pages (`https://hisab-dpua.github.io`).

Alternatif: pakai org-level Pages → repo `hisab-dpua/hisab-dpua.github.io`, URL jadi `https://hisab-dpua.github.io/`.

## Custom domain

Buat file `CNAME` (uppercase, tanpa ekstensi) berisi domain Anda, mis. `hisab.dpua.id`. Setup DNS CNAME record ke `hisab-dpua.github.io`. Update backend CORS whitelist ke domain custom.

## Struktur

```
/
├─ index.html, register.html, login.html, pending-approval.html
├─ hisab.html, compare.html, history.html, admin.html
└─ assets/
   ├─ config.js     # API_BASE
   ├─ app.js        # fetchAPI wrapper + token management
   ├─ hisab.js      # multi-city report
   ├─ compare.js    # dual-method side-by-side
   ├─ history.js    # riwayat
   └─ admin.js      # admin CRUD + approval panel
```

Tidak ada build step — pure HTML + vanilla JS + Tailwind/DaisyUI dari CDN.
