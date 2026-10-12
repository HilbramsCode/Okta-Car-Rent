# Perbaikan Label Tabel Pelanggan Teratas

Hanya perubahan label tampilan pada halaman Analitik Pelanggan. Tidak ada perubahan RPC, database, data, atau rumus perhitungan.

## Masalah

Kolom "Nilai Sewa" terlihat seperti nilai kontrak, padahal isinya total pembayaran lunas yang diterima dalam periode filter aktif. Kolom "Tunggakan" berisi seluruh piutang terbuka penyewa tanpa filter periode. Beda basis ini membingungkan.

## Perubahan

Pada tabel Pelanggan Teratas:

- "Nilai Sewa" menjadi "Pembayaran Diterima" dengan keterangan periode aktif.
- "Tunggakan" menjadi "Tunggakan (Total)".
- "Kontrak" diberi keterangan bahwa hitungannya seluruh waktu, bukan periode.
- Catatan singkat di bawah tabel menjelaskan: pembayaran diterima mengikuti periode yang dipilih, sedangkan jumlah kontrak dan tunggakan dihitung menyeluruh.

## Detail teknis

Satu file yang disentuh: `src/routes/_authenticated/dashboard/analitik.pelanggan.tsx`. Hanya teks header tabel dan penambahan paragraf catatan. Struktur data, query, dan `ambilAnalitikPelanggan` tidak diubah.
