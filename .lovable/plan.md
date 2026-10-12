# Poin 4 — Periode Pembayaran Tunggakan Kontrak (Rencana Implementasi Final)

Status: rencana. Belum ada kode, migrasi, SQL, atau Build yang dijalankan. **Semua tes di bawah masih berstatus RENCANA sampai benar-benar dijalankan dan hasilnya dilaporkan.**

## Keputusan yang disetujui
- Periode 1–6 hari, mingguan 7 hari, bulanan kalender (tanggal tidak tersedia → hari terakhir bulan tersebut).
- Tagihan dibuat bertahap saat periode dimulai; jatuh tempo = akhir periode.
- Total kontrak menjadi acuan; diskon dan biaya tambahan ikut proporsional; saat selesai hanya nominal yang belum pernah ditagih yang ditagih.
- **K1 = Opsi B:** pembayaran kontrak berperiode hanya dialokasikan ke tagihan kontrak yang sama. Kontrak tanpa periode tetap seperti sekarang.
- **Perpanjangan kontrak berperiode ditolak sementara** di aplikasi dan database. Kontrak tanpa periode tetap bisa diperpanjang.
- Notifikasi tunggakan tidak diubah; tidak ada masa tenggang baru.
- Tidak diubah: Poin 11, override Owner, RLS, snapshot harga, tarif dasar, deposit, perilaku kontrak lama, aturan minimum kontrak.

## 1. Aturan perhitungan
- Periode ke-n mulai = start_date + (n-1) x N hari, atau start_date + (n-1) bulan (bulanan). Akhir = mulai periode berikutnya - 1 hari, dipotong pada end_date. Jatuh tempo = akhir periode.
- Nominal periode i < n = floor(T x hari_i / total_hari); periode terakhir = T - jumlah periode sebelumnya.
- T = total_amount, D = jumlah amount_due tagihan kontrak (sudah ditagih), U = T - D (belum pernah ditagih), S = jumlah (amount_due - amount_paid) (ditagih, belum lunas). Pembayaran/pembalikan hanya mengubah S.
- Jaminan: D ≤ T selalu; D + U = T; D = T hanya setelah periode terakhir atau tagihan akhir terbit. Tagihan tidak dibuat jika akan membuat D > T atau bernilai 0.
- Contoh: Rp185.000 x 10 hari = Rp1.850.000, periode 2 hari → 5 x Rp370.000. T Rp1.000.001, 3 periode → 333.333 + 333.333 + 333.335.

## 2. Alokasi pembayaran — lama vs baru (konflik diperiksa)
Jalur alokasi yang ada:
1. `alokasiOtomatis` (lib/payments.ts:560) — dipanggil saat pembayaran dicatat staf dan saat diverifikasi; saat ini lintas kontrak per penyewa.
2. `lunasiTunggakan` — membuat pembayaran untuk kontrak tagihan lalu mengalokasikan ke tagihan yang dipilih.
3. `alokasikan` — alokasi manual.
4. Job baru — alokasi pembayaran di muka saat tagihan periode dibuat.

Perubahan:
- **Database (pagar utama, tidak bisa dilewati):** `validate_payment_allocation` ditambah satu pemeriksaan: jika kontrak pembayaran ATAU kontrak tagihan memiliki payment_period, keduanya harus kontrak yang sama; jika tidak, ditolak. Pemeriksaan lain di fungsi itu tidak berubah. Ini juga mencegah pembayaran kontrak lama masuk ke tagihan kontrak berperiode (arah sebaliknya).
- **Aplikasi:** `alokasiOtomatis` — jika kontrak pembayaran berperiode, filter tunggakan `contract_id` = kontrak itu; jika tidak, tagihan dari kontrak berperiode dikecualikan dari daftar. Kontrak lama selain itu tetap lintas kontrak seperti sekarang.
- **Job:** alokasi di muka hanya memakai pembayaran `contract_id` = kontrak tagihan, status lunas, sisa belum teralokasi > 0, urut terlama; dijalankan hanya jika INSERT tagihan benar-benar membuat baris baru.
- `reverse_payment_allocations` dan `sync_outstanding_from_allocations` tidak diubah.

Konflik yang tersisa (diterima, dicatat):
- `lunasiTunggakan` memanggil `catatPembayaranStaf`, yang memanggil `alokasiOtomatis` lebih dulu. Untuk kontrak berperiode, pembayaran pelunasan bisa teralokasi ke tagihan TERLAMA kontrak yang sama, bukan tagihan yang dipilih. Kontraknya tetap benar; total kewajiban tidak berubah. Perilaku ini sama dengan kontrak lama hari ini, jadi tidak diubah di Poin 4.
- `alokasiOtomatis` berjalan di sisi aplikasi (tidak atomik). Pagar di database menjamin tidak ada alokasi lintas kontrak maupun berlebih walaupun aplikasi dilewati.

Idempotensi: kunci baris kontrak `FOR UPDATE`; unique `(contract_id, period_index)` + `ON CONFLICT DO NOTHING RETURNING`; alokasi hanya untuk tagihan yang baru dibuat; trigger validasi membatasi nominal.

## 3. Penolakan perpanjangan kontrak berperiode
- **Database:** trigger validasi BEFORE UPDATE pada contracts: jika payment_period terisi, status lama aktif/terlambat, dan end_date diubah → ditolak dengan pesan "Perpanjangan untuk kontrak dengan periode pembayaran belum didukung. Hubungi Owner." Juga: payment_period hanya boleh diubah saat status draft.
- Tidak bentrok dengan `selesaikanKontrak` (tidak mengubah end_date), `batalkanKontrak`, `mark_overdue_contracts` (hanya status), `sync_vehicle_status_from_contract`, atau trigger Poin 11 (hanya INSERT / ganti renter_id). Edit draft tetap bebas mengubah end_date.
- **Aplikasi:** `perpanjangKontrak` menolak lebih awal dengan pesan yang sama; tombol Perpanjang di halaman detail kontrak dinonaktifkan untuk kontrak berperiode dengan keterangan.
- `contract_extensions` tidak tersentuh untuk kontrak berperiode karena update kontrak ditolak lebih dulu.

## 4. Kontrak selesai
`create_outstanding_on_completion`: cabang baru hanya jika payment_period terisi → tagihan akhir = U (period_index 0, unik), jatuh tempo mengikuti cabang lama (hari ini + 7) karena tidak ada SOP baru. Cabang lama untuk kontrak tanpa periode tidak berubah.

## 5. Jatuh tempo dan notifikasi
Tagihan periode: due_date = akhir periode. `periksa_tunggakan_harian` tidak diubah (due_date < hari ini), jadi tagihan dianggap lewat jatuh tempo mulai hari setelah akhir periode — perilaku lama, bukan aturan tenggang baru. Masa tenggang tetap BLOCKER sebagai pekerjaan terpisah.

## 6. File dan objek database yang berubah
**Satu migrasi aditif:**
- `contracts.payment_period` text nullable + CHECK 8 nilai. Tanpa backfill.
- `outstanding_payments.period_index`, `period_start`, `period_end` nullable + unique index parsial `(contract_id, period_index)`.
- Baru: `hitung_periode_kontrak` (STABLE, bukan SECURITY DEFINER).
- Baru: `buat_tagihan_periode_harian()` (SECURITY DEFINER, search_path=public, EXECUTE dicabut dari PUBLIC/anon/authenticated).
- Baru: trigger + fungsi `validate_contract_payment_period` (perpanjangan & perubahan periode).
- Diubah: `validate_payment_allocation` (pemeriksaan kontrak sama), `create_outstanding_on_completion` (cabang berperiode), `jalankan_pemeriksaan_harian_sistem` (satu panggilan tambahan). Ketiganya dari definisi asli yang dibaca dari database; owner, SECURITY DEFINER, search_path, dan ACL dipertahankan.

**Aplikasi:**
- `src/lib/contracts.ts` — opsi periode, `hitungJadwalPeriode`, kirim payment_period, penolakan di `perpanjangKontrak`.
- `src/components/contracts/FormKontrak.tsx` — pilihan Periode Pembayaran wajib untuk kontrak baru + pratinjau nominal.
- `src/routes/_authenticated/dashboard/admin/contracts/$id/index.tsx` — tampilkan periode dan tagihan per periode; nonaktifkan Perpanjang untuk kontrak berperiode.
- `src/lib/payments.ts` — filter `alokasiOtomatis` sesuai K1.
- `src/lib/labels.ts` — label periode.
- `src/lib/contracts.test.ts` (baru).

## 7. Rollback
Kembalikan tiga fungsi yang diubah dari salinan definisi asli; hapus dua fungsi baru dan trigger validasi baru; kolom baru tidak di-drop, ditandai DEPRECATED; kembalikan file aplikasi. Tagihan dan alokasi yang sudah dibuat tetap sah.

## 8. Risiko tersisa
- Pelunasan kontrak berperiode bisa teralokasi ke tagihan terlama kontrak yang sama (bagian 2).
- Job harian: kontrak diproses dalam blok pengecualian masing-masing agar satu kegagalan tidak membatalkan semua; tagihan bisa terlambat sampai job berikutnya (job berjalan sekali sehari 22:00 UTC = 05:00 WIB).
- Tagihan periode 1 hari menghasilkan banyak notifikasi lewat jatuh tempo (satu per tagihan).
- Masa tenggang dan aturan perpanjangan kontrak berperiode menunggu keputusan terpisah.
- Aturan minimum kontrak 3 bulan tidak ditemukan di kode/database; tidak disentuh.

## 9. Tes wajib (semua masih RENCANA)
Unit (`src/lib/contracts.test.ts`):
1. Rp185.000/hari, periode 2 hari → Rp370.000 per periode.
2. Total Rp1.000.001, 3 periode → jumlah tepat Rp1.000.001, tiap periode ≥ 0.
3. Bulanan mulai 31 Jan → periode kedua mulai 28/29 Feb; periode terakhir terpotong di end_date.
4. Tarif dasar dan total kontrak tidak berubah oleh pilihan periode.

Database (dalam transaksi yang di-rollback; tanpa data permanen):
5. Job dua kali dan bersamaan → tidak ada tagihan maupun alokasi ganda.
6. Pembayaran di muka kontrak A → teralokasi ke tagihan A; pembayaran kontrak B (penyewa sama) tidak tersentuh.
7. Alokasi langsung pembayaran kontrak lama ke tagihan kontrak berperiode → ditolak; sebaliknya juga ditolak.
8. Alokasi antar dua kontrak lama → tetap diizinkan (perilaku lama).
9. Pembayaran sebagian/penuh/pembalikan → T, D, U tetap; status sebagian/lunas benar.
10. Kontrak berperiode selesai lebih awal + biaya tambahan → tagihan akhir = U; lalu D = T.
11. UPDATE end_date kontrak berperiode aktif lewat API → ditolak; kontrak lama → berhasil; edit draft berperiode → berhasil.
12. Kontrak tanpa periode selesai → satu tagihan seperti sekarang.
13. Fungsi baru tidak bisa dipanggil anon/authenticated; search_path terkunci; ACL tiga fungsi yang diubah identik dengan sebelum migrasi.
14. Regresi Poin 11: penyewa belum terverifikasi ditolak; Admin tidak bisa override; Owner override dengan alasan ≥10 karakter berhasil.

Aplikasi:
15. Build OK; FormKontrak menampilkan 8 pilihan dan pratinjau; tombol Perpanjang nonaktif dengan pesan untuk kontrak berperiode (cek browser).

## 10. Kompleksitas
Sedang–tinggi: 1 migrasi (2 fungsi baru, 1 trigger baru, 3 fungsi diubah), 6 file aplikasi, 15 tes. Bagian termahal: fungsi job dan tes database.
