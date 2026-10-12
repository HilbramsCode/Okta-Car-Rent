# Verifikasi Keamanan Akhir — Kelola Pengguna

Pemeriksaan ini hanya membaca. Tidak ada data, akun, peran, kode, atau proyek lama yang diubah.

| # | Pemeriksaan | Hasil | Bukti |
|---|---|---|---|
| 1 | Menolak jika `auth.uid()` kosong; pemanggil harus punya tepat satu peran, yaitu `owner` | PASS | Isi fungsi yang aktif: jika `v_caller IS NULL` → `TIDAK_LOGIN`; jika jumlah peran ≠ 1 atau jumlah `owner` ≠ 1 → `BUKAN_PEMILIK` |
| 2 | `SECURITY DEFINER` dengan `search_path = public` | PASS | Di katalog database: `prosecdef = true`, `proconfig = search_path=public`, pemilik `postgres` |
| 3 | Hak EXECUTE dicabut dari PUBLIC dan anon, hanya diberikan ke authenticated | PASS | Daftar hak akses fungsi: `postgres`, `authenticated`, `service_role` (tidak ada PUBLIC). `has_function_privilege('anon', …) = false`. `service_role` adalah peran server bawaan dan tidak dapat diakses dari browser |
| 4 | Memakai `pg_advisory_xact_lock` dan `SELECT … FOR UPDATE`, lalu memeriksa ulang kelayakan | PASS | Kunci diambil berdasarkan akun target, lalu baris peran dan baris penyewa target dikunci. Semua pemeriksaan kelayakan dijalankan setelah kunci diperoleh |
| 5 | Target berperan Renter tetapi tanpa data penyewa ditolak | PASS | Jika `v_renter_id IS NULL` → `DATA_PENYEWA_TIDAK_ADA` |
| 6 | Policy tulis langsung oleh Owner dihapus, policy baca tetap ada | PASS | Satu-satunya policy di tabel peran adalah `user_roles_select` (baca saja). `user_roles_owner_manage` sudah tidak ada |
| 7 | Atomik: jika satu langkah gagal, semua perubahan dibatalkan | PASS (desain) / NOT VERIFIED (uji nyata) | Satu panggilan fungsi berjalan sebagai satu transaksi, dan setiap `RAISE EXCEPTION` membatalkan seluruh perubahan. Belum ada promosi gagal sungguhan yang diuji karena belum ada akun uji |
| 8 | Audit log mencatat perubahan peran dan pelakunya | PASS (desain) / NOT VERIFIED (uji nyata) | Trigger `audit_user_roles` mencatat penghapusan dan penambahan peran dengan pelaku `auth.uid()`. Fungsi juga menulis satu ringkasan `promote_admin` dengan pelaku = pemanggil. Saat ini ada 0 entri `promote_admin`, sesuai karena belum ada promosi |
| 9 | Admin atau Renter tidak bisa mengangkat diri sendiri, membuat Owner, atau memanggil fungsi secara tidak sah | PASS | Hanya dua fungsi yang menulis peran: `handle_new_user` dan `promote_renter_to_admin`. `handle_new_user` hanya memberi `owner` jika belum ada peran sama sekali; saat ini sudah ada 1 peran, jadi pendaftar baru selalu menjadi Renter. `promote_renter_to_admin` hanya memberi nilai tetap `admin`, menolak diri sendiri, dan menolak pemanggil yang bukan Owner tunggal. Tidak ada policy tulis untuk pengguna |
| 10 | Pemeriksaan tidak mengubah apa pun | PASS | Hanya query baca. Jumlah saat ini: 1 akun, 1 peran (Owner), 0 promosi. Proyek lama tidak disentuh |

## Langkah verifikasi berikutnya (perlu persetujuan Anda)

Poin 7 dan 8 baru terbukti dari desain. Untuk membuktikannya secara nyata:
1. Satu calon Admin mendaftar lewat halaman Daftar dan mengonfirmasi email.
2. Anda menekan **Jadikan Admin** di Kelola Pengguna.
3. Saya memeriksa (baca saja): akun target punya tepat satu peran `admin`, tidak ada sisa `renter`, data penyewanya nonaktif, ada 3 entri audit dengan pelaku Anda, dan Owner tetap satu.
4. Uji penolakan (Admin memanggil fungsi, atau target yang punya riwayat) memerlukan akun tambahan dan hanya dilakukan jika Anda setujui.

Tidak ada perubahan kode atau database yang diperlukan dari pemeriksaan ini.
