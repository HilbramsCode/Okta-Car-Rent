# Isi Baris Awal Pengaturan Perawatan (pilot)

Target: backend pilot `rjqlmsndbbqbltqandcx`. Proyek lama tidak disentuh.

## Langkah
1. Cek ulang: hitung jumlah baris di `maintenance_settings`. Jika sudah ada baris, berhenti dan laporkan.
2. Jika tabel masih kosong, jalankan satu perubahan data lewat alat perubahan data. Alat ini tidak dibatasi aturan akses aplikasi, dan bukan migrasi.
   ```text
   INSERT INTO public.maintenance_settings
     (id, oil_interval_km, tire_interval_km, oil_warning_km, tire_warning_km)
   VALUES (true, 5000, 40000, 500, 1000)
   ON CONFLICT (id) DO NOTHING;
   ```
   - `updated_at` diisi otomatis oleh database.
   - `ON CONFLICT DO NOTHING` mencegah pengaturan yang sudah ada tertimpa.
3. Tidak ada perubahan pada aturan akses, izin, peran, trigger, fungsi, kode, Build, atau migrasi.

## Verifikasi (hanya membaca)
- Jumlah baris = 1, dan nilainya 5000 / 40000 / 500 / 1000.
- Daftar servis jatuh tempo diperiksa dengan perhitungan yang sama seperti `fleet_maintenance_due`, langsung dari tabel. Fungsi aslinya hanya mengembalikan hasil untuk staf yang sedang login.
  - Perkiraan: 3 kendaraan aktif tampil. Semua odometer masih 0, jadi sisa jarak 5000 km (oli) dan 40000 km (ban), status "aman".
- Satu entri audit dari trigger audit akan tercatat dengan pelaku kosong (sistem).
- Penyimpanan lewat halaman Owner **tidak diklaim berhasil**. Itu akan diuji terpisah.
