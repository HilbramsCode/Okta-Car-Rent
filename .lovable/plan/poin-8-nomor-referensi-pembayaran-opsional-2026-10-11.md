# Poin 8 — Nomor Referensi Pembayaran Opsional

## Hasil pemeriksaan READ-ONLY

**Database sudah mengizinkan referensi kosong:** kolom `payments.reference_number` nullable, tanpa CHECK constraint. Penolakan hanya datang dari validasi aplikasi di 3 titik:

1. **`src/lib/payments.ts`**
   - Baris 52: `memerlukanReferensi = (metode) => metode !== "tunai"` — semua metode non-tunai dianggap wajib referensi.
   - Baris 380–382 (di `validasiNominal`, dipakai `catatPembayaranStaf`/Admin): melempar "Nomor referensi wajib diisi untuk metode non-tunai."
2. **`src/routes/_authenticated/dashboard/admin/payments/new.tsx`** — tidak ada validasi referensi sendiri; penolakan datang dari `validasiNominal` di atas.
3. **`src/routes/_authenticated/dashboard/renter_.payments.tsx`**
   - Baris 96–97 (handler submit Penyewa): melempar "Nomor referensi wajib diisi untuk pembayaran non-tunai."
   - `ajukanPembayaranPenyewa` (payments.ts 427+) tidak memvalidasi referensi; sudah menyimpan `trim() || null`.

Nilai referensi yang diisi tetap tersimpan seperti biasa (`trim() || null`), dan deteksi duplikat referensi tetap berjalan bila referensi diisi.

## Perubahan minimum (2 file, tanpa menyentuh database)

1. **`src/lib/payments.ts`**
   - Hapus blok validasi wajib referensi di `validasiNominal` (baris 380–382).
   - Hapus fungsi `memerlukanReferensi` bila tidak dipakai lagi, atau biarkan terhapus bersama pemakaiannya.
2. **`src/routes/_authenticated/dashboard/renter_.payments.tsx`**
   - Hapus pemeriksaan wajib referensi di handler `kirim` (baris 96–97).
   - Opsional: ubah label kolom dari "Nomor Referensi" menjadi "Nomor Referensi (opsional)" agar jelas bagi penyewa; hal yang sama di `admin/payments/new.tsx` bila labelnya menandai wajib.

Tidak ada perubahan database, skema, RLS, routing, atau fitur lain. Verifikasi pascaperbaikan: catat pembayaran transfer tanpa referensi sebagai Admin dan sebagai Penyewa — keduanya harus berhasil; pembayaran dengan referensi terisi tetap tersimpan dan deteksi duplikat tetap bekerja.
