# Diagnosis lanjutan Poin 11: status kelayakan tidak muncul

## Akar masalah (dibuktikan dengan percobaan di browser uji)
Fungsi pemeriksaan kelayakan di database **gagal untuk setiap penyewa yang belum memenuhi syarat**. Formulirnya bekerja dengan benar.

Bukti dari browser uji (login sebagai Owner, memilih penyewa "Jordi Amat"):
- Pemeriksaan langsung terkirim saat penyewa dipilih, dengan data yang benar (id penyewa, tanggal mulai, dan tanggal selesai hari ini).
- Database menjawab **HTTP 400**: `malformed array literal: "Penyewa belum diverifikasi."` (kode 22P02).
- Aplikasi mencoba ulang 3 kali secara otomatis (jedanya bertambah, total sekitar 7 detik). Selama itu status tetap "Memeriksa kelayakan penyewa…". Setelah percobaan habis, status berubah menjadi "gagal". Karena itu, perubahan status baru terlihat sekitar saat Anda menekan Lanjut.

Penyebab di fungsi `check_renter_eligibility` (dibaca langsung dari database pilot):
```text
v_blocks := v_blocks || 'Penyewa belum diverifikasi.';
```
`v_blocks` bertipe daftar teks (`text[]`). Karena teks tanpa tipe yang jelas digabung ke sebuah daftar, database membacanya sebagai daftar juga, sehingga gagal. Masalah ini muncul pada setiap baris yang menambahkan alasan penolakan atau peringatan (nonaktif, belum diverifikasi, KTP/SIM belum ada, SIM kedaluwarsa, kontrak berjalan). Penyewa yang memenuhi semua syarat tidak menambahkan apa pun, jadi lolos tanpa error.

Bug ini sudah ada di definisi asli. Migrasi A hanya menambahkan pemeriksaan staf di awal fungsi. Tidak ada fungsi database lain yang memanggil fungsi ini, termasuk trigger Poin 11. Jadi penolakan kontrak di database tetap bekerja seperti seharusnya.

## Yang terbukti bukan penyebab
- `useQuery` memakai `renter_id` dan tanggal yang benar, dan pemeriksaan otomatis memang terpanggil.
- Hasil di layar dibaca langsung dari jawaban pemeriksaan, bukan dari tombol Lanjut. Perbaikan sebelumnya sudah benar, tapi jawaban dari database tidak pernah sukses.

## Perubahan minimum
1. **Migrasi** `fix_check_renter_eligibility_array_append`: `CREATE OR REPLACE` fungsi dengan isi yang sama persis. Satu-satunya perbedaan: setiap teks yang ditambahkan diberi tipe teks, misalnya `v_blocks := v_blocks || 'Penyewa belum diverifikasi.'::text;`. Hal yang sama berlaku untuk 4 alasan lain dan peringatan kontrak berjalan. Baris tunggakan sudah berupa ekspresi teks, tapi tetap diberi `::text` agar konsisten. Pemilik, SECURITY DEFINER, search_path, pemeriksaan staf, dan hak akses (postgres, authenticated, service_role) tidak berubah. Setelah migrasi akan dicek ulang.
2. **Opsional, tanpa ubah aturan:** di FormKontrak, nonaktifkan percobaan ulang otomatis pada pemeriksaan kelayakan (`retry: false`), supaya error berikutnya langsung tampil, tidak tertahan sekitar 7 detik.

Rollback: kembalikan definisi asli yang sudah dibaca di atas (tanpa `::text`).

## Tes setelah perbaikan
- Admin memilih penyewa belum terverifikasi: kotak merah "Penyewa belum diverifikasi." muncul dalam 1–2 detik tanpa menekan Lanjut, dan Lanjut tetap tertahan.
- Owner: kolom alasan muncul, dan alasan kurang dari 10 karakter tetap ditolak.
- Penyewa yang memenuhi syarat: kotak hijau tetap muncul.
- Pengguna yang belum login atau Renter yang memanggil fungsi tetap ditolak ("Akses ditolak").
