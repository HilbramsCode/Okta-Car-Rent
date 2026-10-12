# Rencana Real-World QA — Okta Car Rent Pilot

Laporan ini dibuat hanya dengan membaca. Tidak ada data, kode, atau database yang diubah.

## Kondisi pilot saat ini

| Data | Jumlah |
|---|---|
| Kendaraan, kontrak, pembayaran, deposit, tunggakan, perawatan, bengkel, notifikasi | 0 |
| Data penyewa | 1 (milik Admin, nonaktif) |
| Akun | 2: Owner dan Admin |
| Template checklist inspeksi | 0 |
| Pengaturan interval servis | 0 baris |
| Jadwal pemeriksaan harian | sudah berjalan 1 kali |

**Dua temuan yang perlu dicek lebih dulu (NOT TESTED):**
- **Pengaturan servis kosong.** Halaman Pengaturan Perawatan dan perhitungan servis jatuh tempo mungkin membutuhkan 1 baris pengaturan. Kalau baris itu tidak ada, halaman bisa error atau menampilkan angka kosong.
- **Template checklist kosong.** Checklist serah terima di kontrak mungkin muncul tanpa item.

## Urutan pengujian

Setiap modul membutuhkan data dari modul sebelumnya, jadi pengujian harus berurutan:

```text
Kendaraan -> Penyewa (akun Renter baru) -> Kontrak -> Deposit + Pembayaran
-> Pengembalian / Tunggakan -> Perawatan -> Notifikasi -> Laporan
```

## Checklist

Semua item di bawah berstatus NOT TESTED. Pengujian dilakukan lewat browser oleh Anda, lalu saya cek database tanpa mengubahnya.

### 1. Kendaraan (Admin) — tidak butuh data lain
- [ ] Tambah 1 kendaraan dengan data lengkap (tarif harian/mingguan/bulanan, deposit, odometer)
- [ ] Unggah 1 foto dan 1 dokumen (STNK)
- [ ] Ubah data dan status, lalu pastikan riwayat status tercatat
- [ ] Kendaraan tampil di halaman publik Armada

### 2. Penyewa — butuh 1 akun Renter baru (email asli kedua)
- [ ] Renter mendaftar dan mengonfirmasi email; peran Renter dan data penyewa terbentuk otomatis
- [ ] Renter mengunggah KTP/SIM; Admin memverifikasi
- [ ] Nomor telepon yang sama dengan penyewa lain ditolak dengan pesan yang jelas (risiko yang sudah diketahui)

### 3. Kontrak — butuh kendaraan dan penyewa yang terverifikasi
- [ ] Admin membuat kontrak; harga mengikuti tarif kendaraan
- [ ] Deposit terbentuk otomatis
- [ ] Kontrak yang tanggalnya bentrok untuk kendaraan yang sama ditolak
- [ ] Status kendaraan berubah menjadi Disewa
- [ ] Checklist serah terima (cek dampak template kosong)
- [ ] Renter melihat kontraknya di "Kontrak Saya"

### 4. Pembayaran — butuh kontrak
- [ ] Admin mencatat pembayaran tunai; nomor kwitansi terbentuk
- [ ] Renter mengunggah bukti transfer, lalu Admin memverifikasi atau menolaknya
- [ ] Notifikasi muncul untuk Admin/Owner dan Renter

### 5. Deposit — butuh kontrak
- [ ] Deposit diterima
- [ ] Potongan kerusakan dicatat dengan nota bengkel
- [ ] Pengembalian sebagian dan penuh

### 6. Tunggakan — butuh kontrak yang selesai dengan sisa tagihan
- [ ] Tunggakan terbentuk saat kontrak diselesaikan
- [ ] Pembayaran sebagian menurunkan sisa tagihan
- [ ] Pengingat terkirim

### 7. Perawatan — butuh kendaraan, bengkel, dan pengaturan servis
- [ ] Tambah bengkel; jadwalkan, kerjakan, dan selesaikan perawatan
- [ ] Status kendaraan Perawatan lalu kembali Tersedia
- [ ] Halaman pengaturan dan daftar jatuh tempo (risiko pengaturan kosong)

### 8. Notifikasi — butuh hasil langkah 3 sampai 7
- [ ] Ikon lonceng, tandai sudah dibaca, halaman notifikasi
- [ ] Pemeriksaan harian membuat notifikasi kontrak terlambat (butuh kontrak yang lewat tanggal)

### 9. Laporan dan Analitik (Owner) — butuh data dari langkah 3 sampai 7
- [ ] Angka di Ringkasan, Pendapatan, dan Armada sesuai dengan data uji
- [ ] Ekspor dari Pusat Laporan berhasil

## Langkah manual pertama (paling aman dan hemat credits)

1. Masuk sebagai **Admin**, lalu buka **Manajemen Kendaraan → Tambah Kendaraan**.
2. Isi 1 kendaraan uji. Contohnya pelat "B 0001 QA" dengan catatan "DATA UJI". Unggah 1 foto.
3. Buka juga **Perawatan → Pengaturan** satu kali. Kalau halamannya error, catat pesannya.
4. Kirim hasilnya ke saya. Saya akan memeriksa database dalam 1 query baca untuk mencatat PASS atau FAIL di langkah 1 dan untuk temuan pengaturan servis.

Tidak ada perubahan yang dibuat. Data uji hanya dibuat oleh Anda lewat aplikasi.
