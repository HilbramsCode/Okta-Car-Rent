# Rencana Perbaikan Minimal — Notifikasi "{}" saat Daftar

Belum ada yang diubah. Database, constraint, trigger, fungsi backend, dan aturan nomor telepon tidak disentuh. Tidak ada pengecekan nomor sebelum daftar.

## Bisakah konflik nomor telepon dikenali dengan andal?
Tidak. Saat sign-up gagal di trigger, backend hanya mengirim status 500 dengan pesan umum (atau kosong). Nama constraint `renters_phone_unique` hanya muncul di log server, tidak dikirim ke browser. Aplikasi tidak bisa membedakan bentrok nomor dari kegagalan database lain. Jadi tidak ada pesan khusus untuk nomor telepon. Kasus ini masuk ke pesan generik, ditambah saran untuk memeriksa nomor telepon.

## Perubahan (2 file baru, 1 file diubah)
1. **Baru: `src/lib/pesan-daftar.ts`.** Satu fungsi murni `pesanGagalDaftar(error)` yang mengembalikan teks Indonesia:
   - Pesan berisi "weak" dan "guess", atau "pwned"/"leaked" → pesan kata sandi lemah yang sudah ada sekarang.
   - Pesan berisi "already registered" / "already" → "Email sudah terdaftar. Silakan masuk." (sama seperti sekarang).
   - Pesan berisi "rate limit" → "Terlalu banyak percobaan. Coba lagi beberapa saat lagi."
   - Selain itu, termasuk status ≥ 500, pesan kosong, `"{}"`, objek kosong, dan "Database error…" → **"Pendaftaran belum berhasil. Periksa data Anda (termasuk nomor telepon) atau coba lagi nanti."**
   - Pesan mentah dari server tidak pernah ditampilkan.
2. **Ubah: `src/routes/auth.tsx`, bagian `FormDaftar.onSubmit`.** Blok `if (error) {...}` diganti dengan `toast.error(pesanGagalDaftar(error))`. Error tetap dicatat ke console untuk diagnosis. Hal lain tidak diubah: skema validasi (kata sandi 8–72, nama, telepon), `emailRedirectTo`, data `full_name`/`phone`, dan navigasi setelah sukses.
3. **Baru: `src/lib/pesan-daftar.test.ts`.** Tes vitest untuk setiap pemetaan di atas.

## Potensi regresi
- Pesan yang dulu tampil apa adanya, misalnya error format email dari server, sekarang menjadi pesan generik. Risikonya rendah karena format email sudah diperiksa di formulir.
- Pengguna yang memakai nomor ganda hanya mendapat petunjuk umum, bukan alasan yang pasti.
- Formulir Masuk dan halaman reset kata sandi tidak diubah.

## Pengujian setelah implementasi
1. Jalankan tes vitest untuk `pesan-daftar` dan pastikan lulus. Tes `promote-admin` yang sudah ada harus tetap lulus.
2. Pastikan log build bersih.
3. Uji di browser tanpa membuat akun: tiru respons 500 untuk sign-up lewat Playwright, lalu pastikan notifikasi menampilkan pesan generik, bukan `{}`.
4. Cek baca-saja di database: jumlah akun dan data penyewa tidak berubah.
5. Uji nyata opsional oleh Anda: daftar dengan nomor baru. Hasilnya harus sukses dan mengirim email konfirmasi, lalu akun mendapat role penyewa dan data penyewa.
