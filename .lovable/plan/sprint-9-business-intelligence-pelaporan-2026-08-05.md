# Sprint 9 — Business Intelligence & Pelaporan

Tujuan: pemilik paham kondisi perusahaan dalam 30 detik, tanpa membuat data operasional baru. Semua angka dihitung dari data yang sudah ada (kontrak, pembayaran, tunggakan, deposit, kendaraan, perawatan).

## Keputusan yang sudah disepakati
- Admin: laporan operasional + pendapatan harian. Tidak melihat ringkasan tahunan, laba, atau rekap eksekutif.
- Ekspor: CSV dan Excel (.xlsx). PDF tidak dikerjakan di sprint ini.
- Kesegaran data: cache 5 menit dengan tombol "Muat ulang data" dan label "Data per HH:MM".
- Pembanding KPI: bulan ini vs bulan lalu (selisih nominal + persentase).

## Modul 1 — Dashboard Eksekutif (`/dashboard/owner`)
Urutan baca dari atas ke bawah, satu kolom di ponsel:

1. Baris Sorotan (paling atas) — maksimal 4 kalimat fakta, hanya muncul jika benar. Contoh: "Pendapatan bulan ini turun 18% dari bulan lalu", "Tunggakan naik Rp 4,2 jt", "3 kendaraan lewat jadwal ganti oli", "5 pembayaran menunggu verifikasi".
2. Kartu Uang: Pendapatan Hari Ini, Bulan Ini (+pembanding), Tahun Ini, Tunggakan Berjalan, Deposit Ditahan, Biaya Perawatan Bulan Ini (+pembanding).
3. Kartu Armada: Tersedia, Disewa, Perawatan, Tingkat Keterisian (%) (+pembanding).
4. Kartu Operasional: Kontrak Aktif, Kontrak Terlambat, Pembayaran Menunggu Verifikasi.
5. Tabel ringkas "Perlu Tindakan": kontrak jatuh tempo 7 hari, tunggakan terlama, perawatan terlambat — tiap baris bertaut ke modul terkait.
6. Tren pendapatan 12 bulan: satu grafik batang sederhana + tabel angka di bawahnya, sehingga angka tetap terbaca tanpa grafik.

Diberi pembanding bulan lalu: Pendapatan Bulan Ini, Biaya Perawatan, Tunggakan, Keterisian, Kontrak Aktif. KPI harian, tahunan, dan saldo tidak diberi pembanding karena menyesatkan.

## Modul 2-6 — Halaman analitik (khusus pemilik)
Semua halaman berbagi pemilih periode (bulan ini / bulan lalu / tahun ini / rentang bebas) dan tombol ekspor.

- Analitik Pendapatan (`/dashboard/owner/analytics/revenue`): tren harian, mingguan, bulanan, tahunan; pendapatan per kendaraan, per kategori, per tipe sewa, per metode bayar; tren penagihan tunggakan; tren verifikasi pembayaran (jumlah + rata-rata jam tunggu).
- Analitik Armada (`/analytics/fleet`): paling sering disewa, pendapatan tertinggi & terendah, biaya perawatan tertinggi, biaya perawatan per KM, tingkat utilisasi, rata-rata durasi sewa, hari kendaraan tidak menghasilkan (downtime), ketersediaan, ringkasan kesiapan oli/ban.
- Analitik Keuangan (`/analytics/finance`): ringkasan tunggakan + umur piutang (0-30 / 31-60 / 61-90 / >90 hari), ringkasan deposit (ditahan, dikembalikan, disita), pembayaran menunggu, biaya perawatan, indikator kas operasional (pembayaran lunas dikurangi biaya perawatan pada periode, ditandai jelas sebagai indikator kas dan bukan laba akuntansi), perbandingan bulanan.
- Analitik Pelanggan (`/analytics/customers`): total, aktif, penyewa baru, penyewa berulang, penyewa teratas menurut nilai, kontrak terpanjang, tunggakan per penyewa, rata-rata durasi kontrak.
- Analitik Perawatan (`/analytics/maintenance`): jatuh tempo oli, jatuh tempo ban, perawatan terlambat, tren jumlah & biaya per bulan, kinerja bengkel, rata-rata lama perbaikan, sebaran kategori preventif/korektif. Bagian yang sudah ada di modul perawatan ditautkan, tidak diduplikasi.

## Modul 7 — Pusat Laporan (`/dashboard/reports`)
Sembilan laporan berbasis tabel dengan pola sama: pencarian, filter periode + status, urutkan per kolom, halaman bertahap, total di kaki tabel, ekspor CSV & Excel.

Laporan: Pendapatan, Kontrak, Kendaraan, Perawatan, Tunggakan, Deposit, Pembayaran, Bengkel, Pelanggan.

Akses admin: Kontrak, Kendaraan, Perawatan, Tunggakan, Deposit, Pembayaran (nominal harian boleh), Bengkel, Pelanggan. Laporan Pendapatan (rekap bulanan/tahunan) dan seluruh halaman analitik hanya untuk pemilik.

## Aturan bisnis angka
- Pendapatan = pembayaran berstatus lunas dan belum dibalik, dihitung pada tanggal pembayaran.
- Tunggakan berjalan = amount_due - amount_paid untuk status belum lunas/sebagian.
- Deposit ditahan = deposit berstatus diterima atau ditahan.
- Keterisian = hari kendaraan terpakai kontrak dalam periode / (jumlah kendaraan aktif x hari periode).
- Downtime = hari kendaraan berstatus perawatan dalam periode.
- Biaya perawatan per KM = total biaya perawatan / pertambahan odometer periode; tampil "-" bila odometer tidak bertambah.
- Penyewa berulang = punya lebih dari satu kontrak selesai.
- Nilai nol tampil sebagai "Rp 0" atau "-", bukan kosong.

## Modul 9 & 13 — Basis data dan performa
- Views untuk perhitungan berulang: pendapatan harian per kendaraan, hari terpakai kontrak per kendaraan, umur piutang, ringkasan deposit, biaya perawatan bulanan.
- RPC agregat (security definer, cek peran di dalam fungsi), satu panggilan per halaman: `bi_executive_summary`, `bi_revenue_analytics`, `bi_fleet_analytics`, `bi_finance_analytics`, `bi_customer_analytics`, `bi_maintenance_analytics`, `bi_owner_insights`. Masing-masing mengembalikan satu jsonb sehingga satu halaman = satu permintaan jaringan.
- Indeks: payments(status, payment_date), payments(contract_id), contracts(status, start_date, end_date), contracts(vehicle_id), outstanding_payments(status, due_date), deposits(status), maintenance_records(vehicle_id, completed_date), maintenance_records(status, scheduled_date), vehicle_odometer_readings(vehicle_id, recorded_at).
- Materialized view belum dipakai: volume data masih kecil, view biasa + indeks cukup dan menghindari data basi. Dicatat sebagai opsi bila laporan tahunan melewati 1 detik.
- Cache: TanStack Query staleTime 5 menit, gcTime 30 menit, tanpa refetch saat fokus jendela, plus tombol muat ulang manual. Laporan tabel memakai kunci cache per kombinasi filter.
- Ekspor mengambil data lewat RPC yang sama dengan batas baris jelas; file CSV dan Excel dibentuk di sisi klien.

## Modul 11 & 12 — Keamanan dan audit
- Pemilik: seluruh dashboard eksekutif, analitik, dan laporan.
- Admin: laporan operasional + pendapatan harian. Halaman analitik dan laporan pendapatan rekap diblokir dua lapis: RoleGate di rute dan pemeriksaan peran di dalam RPC.
- Penyewa: tidak ada akses; percobaan akses dialihkan ke portal penyewa.
- Audit: setiap ekspor dicatat di `audit_logs` (jenis laporan, periode, filter, jumlah baris, pelaku). Pembukaan halaman biasa tidak dicatat agar log tetap bersih; pembukaan Analitik Keuangan dan Laporan Pendapatan dicatat karena memuat rekap keuangan perusahaan.

## Modul 10 — UI/UX
Mengikuti gaya yang sudah ada: kartu bertepi tegas, tipografi besar, warna hanya untuk status (merah = masalah, kuning = perhatian, hijau = sehat), tanpa animasi. Setiap kartu memuat judul, angka besar, dan satu baris penjelasan berbahasa Indonesia. Grafik selalu disertai tabel angka. Tabel laporan dapat digulir horizontal di ponsel dengan kolom pertama menempel.

## Urutan pengerjaan
1. Migrasi: views, indeks, tujuh RPC agregat, pencatatan audit ekspor.
2. Lapisan data: `src/lib/analytics.ts` dan `src/lib/reports.ts` (tipe, pemanggil RPC, pembentuk CSV/Excel).
3. Komponen bersama: KartuKPI dengan pembanding, PanelSorotan, PemilihPeriode, TabelLaporan, TombolEkspor.
4. Dashboard eksekutif baru menggantikan kartu owner saat ini.
5. Lima halaman analitik.
6. Pusat laporan dan sembilan laporan.
7. Navigasi, RoleGate, dan metadata head tiap halaman.

## Ceklis pengujian
- Angka pendapatan dashboard sama dengan total modul pembayaran untuk periode yang sama.
- Pembayaran yang dibalik tidak ikut terhitung.
- Tunggakan dan deposit cocok dengan halaman modulnya.
- Pembanding bulan lalu benar pada awal bulan dan awal tahun.
- Keterisian bernilai 0-100% dan aman saat tidak ada kendaraan aktif.
- Biaya per KM aman saat odometer tidak bertambah (tanpa pembagian nol).
- Sorotan hanya muncul saat kondisinya benar; dashboard tanpa masalah tampil bersih.
- Admin ditolak di halaman analitik dan laporan pendapatan, baik lewat rute maupun panggilan RPC langsung.
- Penyewa tidak bisa membuka rute mana pun di sprint ini.
- Ekspor CSV dan Excel berisi data terfilter yang sama dengan tabel, dan tercatat di audit.
- Halaman terasa cepat pada data setahun; tombol muat ulang memaksa data segar.
- Tampilan rapi di lebar 360px dan di desktop.