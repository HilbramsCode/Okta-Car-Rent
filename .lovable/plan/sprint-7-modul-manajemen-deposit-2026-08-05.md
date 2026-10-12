# Sprint 7 — Modul Manajemen Deposit

Deposit adalah uang jaminan Rp500.000 per kontrak, bukan pendapatan. Modul ini mengelola siklusnya dari dibuat sampai dikembalikan/disita, termasuk potongan tunggakan dan biaya perbaikan bengkel.

## Keputusan yang sudah disepakati
- Nominal deposit dipaksa Rp500.000 untuk semua kontrak baru (nominal deposit per kendaraan tidak lagi dipakai untuk kontrak). Saat ini data kendaraan berisi Rp800rb–Rp5jt, jadi ini perubahan nyata.
- Deposit kontrak & kendaraan yang sudah ada disamakan menjadi Rp500.000.
- Baris deposit dibuat otomatis saat kontrak dibuat dengan status **Menunggu Penerimaan**, lalu menjadi **Ditahan** saat uang benar-benar diterima pada serah terima. (Saat ini baris deposit baru dibuat pada saat aktivasi kontrak.)

## Alur bisnis

```text
Kontrak dibuat  -> Deposit: menunggu_penerimaan (Rp500.000)
Serah terima    -> ditahan (tanggal, metode, bukti)
Kontrak aktif   -> tetap ditahan
Perpanjangan    -> deposit LAMA dipakai, tidak membuat deposit baru
Kontrak selesai -> evaluasi tunggakan + kerusakan/kecelakaan
                   tanpa tunggakan & tanpa kerusakan -> dikembalikan penuh
                   potongan < deposit                -> sebagian dikembalikan
                   potongan >= deposit               -> disita, selisih jadi tunggakan baru
Kontrak dibatalkan sebelum uang diterima -> deposit dibatalkan
```

### Aturan potongan
1. Tunggakan penyewa dipotong dari deposit (sistem mengusulkan, staf mengonfirmasi).
2. Kerusakan/kecelakaan dipotong sebesar nilai invoice bengkel resmi; invoice wajib diunggah sebelum potongan jenis kerusakan disimpan.
3. Total potongan tidak boleh melebihi deposit. Kelebihannya otomatis menjadi tunggakan baru dengan keterangan sumbernya.
4. Nominal pengembalian = deposit − total potongan (minimal 0), dihitung sistem, bukan input manual.

### Aturan pengembalian
- Hanya transfer bank. Wajib: tanggal transfer, nominal, nama bank + nomor rekening + nama pemilik, bukti transfer, diproses oleh, catatan.
- Pengembalian bersifat final. Koreksi hanya lewat **Pembalikan Pengembalian** oleh Owner dengan alasan wajib; status kembali ke ditahan dan riwayat tetap tersimpan.
- Deposit yang sudah dikembalikan tidak bisa dikembalikan dua kali (dicegah di database).

## Validasi
- Kontrak harus selesai (atau dibatalkan) sebelum pengembalian diproses.
- Deposit yang belum diterima tidak bisa dipotong atau dikembalikan.
- Nominal potongan harus > 0 dan ≤ sisa deposit.
- Potongan kerusakan tanpa invoice bengkel diblokir dan ditandai "menunggu invoice".
- Pengembalian tanpa bukti transfer atau tanpa data rekening ditolak.

## Database
Satu migrasi lewat tool migrasi:
- Enum `deposit_status`: tambah `menunggu_penerimaan` dan `dibatalkan` (nilai lama tetap).
- `deposits`: tambah `refund_bank_name`, `refund_account_number`, `refund_account_holder`, `forfeited_reason`, `reversal_reason`, `reversed_at`, `reversed_by`.
- `deposit_deductions`: tambah `deduction_type` (tunggakan | kerusakan | denda | bahan_bakar | lainnya), `workshop_invoice_url`, `workshop_name`, `invoice_number`, `invoice_date`, `outstanding_payment_id`.
- Penyamaan data: `contracts.deposit_amount`, `deposits.amount`, `vehicles.deposit_amount` → 500000.
- GRANT + RLS: staf (owner/admin) akses penuh; penyewa hanya baca deposit & potongan miliknya; tamu tanpa akses.

Trigger & fungsi:
- `create_deposit_on_contract_insert()` — buat deposit Rp500.000 status menunggu penerimaan saat kontrak dibuat; tidak membuat ulang saat perpanjangan.
- `validate_deposit_deduction()` — batasi total potongan, wajibkan invoice untuk jenis kerusakan, kunci potongan pada deposit yang sudah dikembalikan.
- `sync_deposit_status()` — hitung ulang status dari potongan & pengembalian.
- `spill_excess_to_outstanding()` — buat tunggakan baru bila potongan melebihi deposit.
- `enforce_deposit_refund_immutability()` — cegah edit & pengembalian ganda; hanya pembalikan Owner yang boleh mengubah.
- RPC `deposit_settlement_preview(_contract_id)` — deposit, tunggakan berjalan, usulan potongan, dan nominal pengembalian.
- Audit: trigger `record_audit_log()` sudah aktif pada `deposits` dan `deposit_deductions` dan menyimpan nilai sebelum/sesudah; dipastikan mencakup kolom baru.
- Notifikasi: trigger baru untuk "deposit diterima", "potongan dicatat", "deposit disita"; `notify_deposit_refunded()` yang sudah ada dipakai untuk pengembalian.

## Halaman & UI
1. `dashboard/admin/deposits` — daftar deposit: filter status/penyewa/kontrak/tanggal, kartu ringkasan (ditahan, menunggu penerimaan, dikembalikan bulan ini, disita).
2. `dashboard/admin/deposits/$id` — detail: info kontrak & penyewa, riwayat potongan dengan pratinjau invoice bengkel, panel penyelesaian, form pengembalian transfer bank, tombol pembalikan khusus Owner, jejak audit.
3. `dashboard/renter/deposits` — baca saja: nominal, status, rincian potongan, info pengembalian + bukti transfer.
4. Panel deposit di halaman detail kontrak diarahkan ke modul baru agar logika tidak terduplikasi.
5. Dasbor Owner & Admin: kartu "Deposit Ditahan" menjadi tautan, tambah kartu "Menunggu Penerimaan Deposit".

Gaya UI mengikuti modul sebelumnya: bahasa Indonesia, teks besar, tanpa animasi, tabel dan kartu sederhana.

## Urutan implementasi
1. Migrasi database (enum, kolom, penyamaan data, GRANT/RLS, trigger, RPC).
2. Layer data `src/lib/deposits.ts`.
3. Halaman daftar & detail admin, komponen potongan + unggah invoice bengkel.
4. Portal deposit penyewa.
5. Integrasi kontrak & dasbor.
6. Uji end-to-end di browser dengan data asli, lalu bersihkan data uji.

## Checklist pengujian
- Kontrak baru langsung memiliki deposit Rp500.000 menunggu penerimaan.
- Serah terima mengubah status menjadi ditahan beserta bukti.
- Perpanjangan tidak membuat deposit kedua.
- Tunggakan Rp200.000 → pengembalian Rp300.000.
- Tunggakan sama dengan deposit → pengembalian 0, status disita.
- Invoice bengkel Rp800.000 → deposit disita, sisa Rp300.000 menjadi tunggakan.
- Potongan kerusakan tanpa invoice ditolak.
- Pengembalian ganda diblokir; pembalikan Owner memulihkan status dan tercatat di audit.
- Penyewa hanya melihat depositnya sendiri; tamu diarahkan ke halaman masuk.
- Semua aksi finansial muncul di jejak audit dan memicu notifikasi yang tepat.