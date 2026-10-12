# Sprint 8 — Modul Manajemen Perawatan Armada

Tujuan: modul perawatan siap pakai harian oleh Owner/Admin, mencakup perawatan berkala (berbasis KM) dan perbaikan kerusakan, dengan data bengkel, invoice, biaya, riwayat permanen, dan integrasi ketersediaan unit.

## Keputusan yang sudah disepakati
- Interval oli 5.000 KM dan ban 40.000 KM disimpan sebagai pengaturan global yang bisa diubah Owner.
- Kerusakan saat unit masih disewa: default dibuat sebagai jadwal perawatan (unit masuk Perawatan setelah kontrak selesai); Owner boleh memaksa status Perawatan lebih awal dengan alasan wajib.
- Penyewa hanya melihat info minimal ("unit sedang diperbaiki") pada kontrak aktifnya — tanpa biaya, bengkel, atau invoice.
- Bengkel disimpan sebagai daftar master agar performanya bisa dianalisis.

## Alur bisnis

### Perawatan berkala (preventif)
1. Sistem menghitung KM berjalan tiap kendaraan dari odometer terkini dan patokan servis terakhir.
2. Bila sisa KM ke servis berikutnya <= ambang peringatan (default 500 KM oli, 1.000 KM ban), unit masuk daftar "Segera Servis".
3. Bila KM sudah melewati target, statusnya "Terlambat Servis" (sorotan merah). Unit masih bisa disewa, tetapi terus diingatkan.
4. Admin membuat catatan perawatan → unit masuk Perawatan → pekerjaan selesai → invoice dan biaya diisi → unit kembali Tersedia dan patokan KM servis diperbarui.

### Perbaikan (korektif)
Kerusakan dilaporkan → buat catatan perawatan (kecelakaan, mesin, kaki-kaki, AC, kelistrikan, bodi, lainnya) → unit Perawatan (atau dijadwalkan bila masih disewa) → unggah invoice bengkel → catat biaya, bengkel, deskripsi, catatan mekanik → selesai → unit Tersedia.

### Siklus hidup catatan perawatan
```text
Dijadwalkan → Dikerjakan → Selesai
      |            |
      +------------+---> Dibatalkan (alasan wajib)
```
- Dijadwalkan: rencana; unit belum tentu berhenti disewa.
- Dikerjakan: unit di bengkel; status kendaraan menjadi Perawatan.
- Selesai: wajib tanggal selesai, biaya (>= 0), odometer saat servis, dan invoice bengkel bila biaya > 0.
- Dibatalkan: riwayat tetap tersimpan; unit kembali Tersedia bila tidak ada perawatan aktif lain.

### Transisi status kendaraan
- Ke Perawatan: otomatis saat perawatan berpindah ke Dikerjakan, bila unit tidak sedang disewa; bila disewa perlu paksaan Owner beserta alasan.
- Ke Tersedia: otomatis saat semua perawatan aktif kendaraan itu Selesai atau Dibatalkan.
- Unit berstatus Perawatan tidak muncul sebagai unit tersedia di wizard kontrak dan tidak bisa dipakai kontrak baru (validasi ganda: filter daftar unit + trigger kontrak).

## Rekomendasi basis data

Tabel baru
- `workshops`: nama, alamat, telepon, spesialisasi, catatan, status aktif.
- `maintenance_invoices`: relasi ke catatan perawatan, nomor invoice, tanggal, nominal, berkas invoice, catatan. Satu kunjungan bengkel punya satu invoice yang menaungi beberapa item pekerjaan.
- `maintenance_settings` (baris tunggal): interval oli, interval ban, ambang peringatan oli, ambang peringatan ban.
- `vehicle_odometer_readings`: pencatatan KM (manual, dari kontrak, dari perawatan) beserta sumber dan pencatat — dasar audit dan deteksi KM mundur.

Perluasan tabel yang sudah ada
- `maintenance_records`: tambah `workshop_id`, `category` (preventif/korektif), `subtype` (oli, ban, mesin, AC, dsb.), `mechanic_notes`, `started_at`, `cancel_reason`, `contract_id` (bila rusak saat disewa), `forced_by`/`forced_reason`, `next_service_odometer`.
- `maintenance_items`: dipakai untuk beberapa pekerjaan dalam satu kunjungan (mis. oli + ban) dengan biaya per item; total catatan mengikuti jumlah item bila item tersedia.
- `vehicles`: tambah patokan servis terakhir (`last_oil_service_odometer`, `last_tire_service_odometer`) agar perhitungan sisa KM murah dan akurat.

Constraint dan indeks
- Biaya dan nominal invoice tidak boleh negatif; qty item lebih dari nol.
- Odometer tidak boleh lebih kecil dari `current_odometer` kendaraan (divalidasi lewat trigger, bukan CHECK).
- Unik: nomor invoice per bengkel; hanya satu perawatan aktif per kendaraan per jenis pekerjaan untuk mencegah duplikat.
- Indeks: `maintenance_records(vehicle_id, status)`, `maintenance_records(status, scheduled_date)`, `maintenance_invoices(maintenance_record_id)`, `vehicle_odometer_readings(vehicle_id, recorded_at)`.

Trigger yang dibutuhkan
1. Sinkronisasi status kendaraan mengikuti status perawatan (masuk dan keluar Perawatan).
2. Validasi transisi: tidak boleh Selesai tanpa tanggal selesai, biaya, odometer, dan invoice (bila biaya > 0); tidak boleh Dibatalkan tanpa alasan.
3. Validasi odometer: tolak KM mundur, catat pembacaan baru, perbarui `current_odometer`.
4. Perbarui patokan servis saat perawatan preventif Selesai.
5. Larang penghapusan catatan perawatan dan invoice (riwayat permanen); pembatalan menggantikan penghapusan.
6. Blokir status Dikerjakan untuk unit yang sedang disewa kecuali ditandai paksa oleh Owner dengan alasan.
7. Audit log otomatis (`record_audit_log`) pada `maintenance_records`, `maintenance_items`, `maintenance_invoices`, `workshops`, `maintenance_settings`.
8. Notifikasi: perawatan selesai, perawatan terlambat, dan info minimal ke penyewa saat unit kontrak aktifnya masuk perbaikan.

Fungsi RPC
- `fleet_maintenance_due()`: daftar kendaraan dengan sisa KM ke servis oli/ban dan tingkat urgensi.
- `fleet_health_summary()`: angka kartu dashboard (tersedia, dalam perawatan, terlambat, oli segera, ban segera, biaya bulan dan tahun ini).
- `maintenance_cost_report(_dari, _sampai)`: biaya per kendaraan, per jenis, per bulan.
- `workshop_performance()`: jumlah kunjungan, total biaya, rata-rata biaya, rata-rata durasi pengerjaan per bengkel.
- `complete_maintenance(...)`: penyelesaian atomik (biaya, odometer, invoice, patokan servis, status kendaraan).
- `record_vehicle_odometer(...)`: pencatatan KM dengan validasi.

Keamanan (RLS dan izin)
- `maintenance_records`, `maintenance_items`, `maintenance_invoices`, `workshops`, `vehicle_odometer_readings`, `maintenance_settings`: baca dan tulis hanya staf (`is_staff`); mengubah pengaturan interval dan memaksa status hanya Owner.
- Penyewa: akses hanya lewat RPC terbatas yang memberi status "unit sedang diperbaiki" untuk kontrak miliknya, tanpa kolom biaya, bengkel, atau invoice.
- GRANT eksplisit untuk setiap tabel baru (authenticated dan service_role), tanpa akses anon.
- Berkas invoice disimpan di bucket privat `vehicle-photos` dengan prefiks `perawatan/invoice/`, diakses lewat signed URL.

## Halaman yang dibutuhkan

Admin (di bawah `dashboard/admin/maintenance/`)
- Dashboard perawatan: kartu ringkas dan daftar "Segera & Terlambat Servis".
- Daftar perawatan: pencarian (unit, plat, bengkel, nomor invoice) dan filter (status, jenis, kategori, rentang tanggal, kendaraan).
- Detail perawatan: rincian pekerjaan, item biaya, invoice, catatan mekanik, tombol Mulai Kerjakan / Selesaikan / Batalkan, log audit.
- Buat perawatan: pilih kendaraan (peringatan bila sedang disewa), kategori, jenis, bengkel, tanggal, rencana biaya.
- Invoice bengkel: unggah atau ganti berkas, nomor, tanggal, nominal, pratinjau.
- Riwayat perawatan kendaraan: linimasa lengkap, ditautkan dari halaman detail kendaraan.
- Master bengkel: daftar, tambah, ubah, aktif atau nonaktif.
- Pembaruan KM kendaraan: form cepat dan riwayat pembacaan.

Owner
- Dashboard kesehatan armada: unit tersedia, dalam perawatan, terlambat servis, oli segera, ban segera.
- Analitik perawatan: tren jumlah pekerjaan per bulan dan per jenis.
- Analitik biaya: biaya bulan ini, tahun ini, biaya per kendaraan (unit termahal disorot), biaya per jenis.
- Performa kendaraan dan bengkel: biaya per KM tiap unit, performa bengkel.

Penyewa
- Pada dashboard/kontrak penyewa: pemberitahuan singkat bila unit kontrak aktifnya sedang diperbaiki.

## Integrasi dashboard
- Dashboard Owner: kartu Dalam Perawatan, Terlambat Servis, Oli Segera, Ban Segera, Biaya Perawatan Bulan Ini dan Tahun Ini, plus tautan modul.
- Dashboard Admin: tautan "Perawatan Armada" dengan lencana jumlah pekerjaan aktif dan terlambat.
- Halaman detail kendaraan: ringkasan servis berikutnya, tombol buat perawatan, tautan riwayat.
- Wizard kontrak: unit Perawatan disembunyikan, dengan penjelasan bila unit yang dicari tidak tersedia.

## Audit dan notifikasi
- Audit: pembuatan, perubahan status, perubahan biaya, unggah invoice, pembatalan, paksaan Owner, dan perubahan pengaturan interval dicatat dengan nilai sebelum dan sesudah.
- Notifikasi staf: unit terlambat servis (harian), perawatan selesai, invoice belum diunggah lebih dari 3 hari setelah selesai.
- Notifikasi penyewa: hanya info minimal saat unit kontrak aktifnya masuk perbaikan dan saat kembali siap.
- Pengingat harian dijalankan lewat penjadwal basis data yang memanggil endpoint publik terjadwal.

## Aturan validasi dan kasus khusus
- Unit sudah dalam perawatan: pekerjaan aktif kedua dengan jenis sama ditolak dan diarahkan ke catatan yang ada.
- Duplikat: peringatan bila ada pekerjaan aktif jenis serupa dalam 7 hari.
- Biaya negatif, KM tidak wajar, dan KM mundur ditolak dengan pesan berbahasa Indonesia yang jelas.
- Selesai tanpa invoice atau biaya ditolak; opsi "invoice menyusul" hanya bila Owner menandainya, dan unit masuk daftar tunggakan dokumen.
- Rusak saat disewa: dijadwalkan dulu atau dipaksa Owner dengan alasan. Pembebanan biaya ke deposit tetap ditangani modul deposit.
- Satu kunjungan beberapa pekerjaan (oli + ban): satu catatan dengan beberapa item dan satu invoice; kedua patokan KM diperbarui.
- Perawatan dibatalkan: riwayat tetap ada, unit kembali Tersedia.
- Kendaraan dijual atau dinonaktifkan: riwayat perawatan tetap tersimpan dan dapat dilihat.
- Kecelakaan saat sudah ada jadwal: pekerjaan korektif dibuat terpisah, keduanya tampil di detail unit.

## Laporan
Biaya perawatan bulanan dan tahunan, riwayat per kendaraan, biaya per kendaraan, biaya per jenis pekerjaan, performa bengkel, dan biaya per KM. Semua dapat difilter rentang tanggal dan diekspor CSV.

## Checklist pengujian
1. Buat perawatan preventif → unit menjadi Perawatan → tidak muncul di wizard kontrak.
2. Selesaikan perawatan dengan invoice → unit Tersedia, patokan KM diperbarui, perhitungan servis berikutnya benar.
3. Coba selesaikan tanpa biaya atau invoice → ditolak dengan pesan jelas.
4. Masukkan KM lebih kecil dari KM sekarang → ditolak.
5. Buat perawatan untuk unit yang sedang disewa → default dijadwalkan; paksa tanpa alasan ditolak; paksa oleh Admin ditolak.
6. Satu kunjungan dua item (oli + ban) → total biaya benar, dua patokan KM diperbarui.
7. Batalkan perawatan → riwayat tetap, unit Tersedia.
8. Coba hapus catatan perawatan → ditolak.
9. Penyewa membuka dashboard → hanya info minimal, tanpa biaya dan bengkel.
10. Kartu dashboard Owner cocok dengan data mentah; laporan biaya bulan dan tahun cocok dengan jumlah invoice.
11. Log audit memuat nilai sebelum dan sesudah untuk perubahan status dan biaya.
12. Penyewa dan pengguna belum login tidak dapat membaca tabel perawatan (uji RLS).