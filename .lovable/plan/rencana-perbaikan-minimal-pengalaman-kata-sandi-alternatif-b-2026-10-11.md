# Rencana Perbaikan Minimal — Pengalaman Kata Sandi (Alternatif B)

Proteksi kata sandi bocor di backend **tetap aktif**, tidak diubah. Aturan 8–72 karakter tetap. Tidak ada kewajiban huruf besar/angka/simbol baru.

## Cara mengenali error kata sandi bocor secara andal

Backend menolak kata sandi bocor dengan pesan yang memuat frasa seperti "weak and easy to guess", "pwned", atau "leaked" (status 422). Pemetaan ini **sudah ada dan sudah teruji** di `src/lib/pesan-daftar.ts` (fungsi `pesanGagalDaftar`): pesan yang mengandung "weak"+"guess", "pwned", atau "leaked" diarahkan ke pesan kata sandi lemah; semua error lain (status ≥ 500, pesan kosong, `{}`, "database error", pesan tak dikenal) jatuh ke pesan generik. Jadi tidak ada risiko salah klaim: hanya pola yang jelas menunjuk kata sandi bocor yang mendapat pesan khusus.

## Perubahan (2 file diubah, 1 file tes diperbarui)

1. **`src/lib/pesan-daftar.ts`** — ganti isi konstanta `PESAN_SANDI_LEMAH` menjadi:
   > "Kata sandi ini terlalu umum atau pernah ditemukan dalam kebocoran data. Coba gunakan kata sandi unik yang belum pernah Anda pakai di akun lain."

   Logika pemetaan tidak diubah. Pesan generik (`PESAN_DAFTAR_GENERIK`), email terdaftar, dan rate limit tetap seperti sekarang.

2. **`src/routes/auth.tsx`** (bagian `FormDaftar`) — ganti teks petunjuk di bawah kolom kata sandi dari "Minimal 8 karakter." menjadi petunjuk singkat, misalnya:
   > "Minimal 8 karakter. Gunakan kata sandi unik yang mudah diingat, misalnya gabungan 3 kata acak — jangan pakai kata sandi yang sama dengan akun lain."

   Tidak ada perubahan pada skema validasi, alur submit, `emailRedirectTo`, data `full_name`/`phone`, atau navigasi setelah sukses. Kata sandi tidak pernah ditampilkan, dicatat, atau dikirim ke log (error hanya dicatat sebagai objek error, bukan isi formulir).

3. **`src/lib/pesan-daftar.test.ts`** — perbarui 2 tes yang memakai `PESAN_SANDI_LEMAH` agar cocok dengan teks baru (tes memakai konstanta, jadi kemungkinan hanya perlu memastikan impor tetap benar); tambahkan 1 tes bahwa error tak dikenal tetap menghasilkan pesan generik (sudah ada, diverifikasi ulang).

## Yang tidak diubah

- Konfigurasi backend (leaked-password protection tetap ON), database, trigger, fungsi, role, alur konfirmasi email.
- Formulir Masuk dan halaman reset kata sandi.

## Potensi regresi

- Sangat rendah: hanya teks pesan dan teks petunjuk yang berubah. Pemetaan error lain tidak tersentuh.

## Pengujian setelah implementasi

1. Jalankan vitest untuk `pesan-daftar` — semua tes lulus (termasuk tes `promote-admin` yang ada).
2. Pastikan log build bersih.
3. Uji browser tanpa membuat akun: tiru respons penolakan kata sandi bocor (status 422, pesan "weak and easy to guess") lewat Playwright, pastikan notifikasi menampilkan pesan baru; tiru respons 500, pastikan pesan generik yang tampil.
4. Uji nyata opsional oleh Anda: coba daftar dengan kata sandi umum (misalnya pola seperti `juan12345`) — seharusnya muncul pesan baru yang ramah, bukan `{}` atau pesan mentah server.
