# PKG — Penilaian Kinerja Guru

Aplikasi web untuk mengisi identitas guru, menilai instrumen PKG, menghitung rekap nilai dan angka kredit, lalu mencetak laporan F4 enam halaman.

## Deploy ke Vercel (tanpa backend)

Repo ini sudah menyertakan `vercel.json` dengan `outputDirectory: "app"`, sehingga Vercel menyajikan aplikasi dari folder `app` sebagai situs statis.

1. Import repo ini di Vercel.
2. Framework Preset: **Other**.
3. Build Command: kosongkan.
4. Deploy.

Semua data isian disimpan di `localStorage` browser. Tidak ada database atau server yang dibutuhkan.

Pada versi statis, tombol **Cetak / Simpan PDF** membuka dialog cetak browser. Pilih **Save as PDF / Simpan sebagai PDF**; hasilnya tetap enam halaman: lima halaman F4 portrait dan satu halaman Prioritas PKB landscape.

## Menjalankan lokal

```bash
node server.mjs
```

Buka `http://127.0.0.1:4173/`. Di localhost, server juga menyediakan unduhan PDF langsung melalui Chrome/Edge headless (`POST /api/pdf`).

Di Windows, `jalankan-pkg.bat` dapat dipakai untuk membuka aplikasi dan `hentikan-pkg.bat` untuk menghentikan server.

## Catatan

- Font Carlito (WOFF2) dibundel di `app/assets/fonts/` agar ukuran dan pemenggalan halaman konsisten di browser yang tidak memiliki Carlito/Calibri.
- `/api/pdf` hanya tersedia saat menjalankan `server.mjs` secara lokal; Vercel memakai alur cetak browser.
