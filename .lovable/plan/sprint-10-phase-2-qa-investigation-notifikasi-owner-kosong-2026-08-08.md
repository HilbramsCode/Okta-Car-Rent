# Sprint 10 Phase 2 — QA Investigation: Notifikasi Owner Kosong

Investigasi read-only. Tidak ada perubahan kode, database, RLS, trigger, atau data.

## 1. Current Owner ID
User ID Owner diperoleh dari sesi Supabase di browser (`supabase.auth.getUser()` pada gate `_authenticated`, lalu `fetchUserRole(user.id)` di `src/lib/auth.ts` membaca `user_roles`). `auth.uid()` di database berasal dari token sesi yang sama, jadi ID yang dipakai UI dan ID yang dipakai RLS identik. Terdapat 2 akun ber-role `owner`:
- `d65d48d2-…16335`
- `7c158cdc-…4e07` (akun yang terakhir login sebagai owner menurut log auth)

Catatan keterbatasan: alat investigasi membaca database dengan hak istimewa, bukan melalui sesi owner, sehingga `auth.uid()` tidak bisa dievaluasi langsung; pencocokan dilakukan lewat `user_roles.user_id` vs `notifications.user_id`.

## 2. Current Database State
Isi tabel notifikasi saat ini: **2 baris, keduanya belum dibaca, keduanya milik satu akun renter**.

| user_id | role | jumlah notification | unread |
|---|---|---:|---:|
| 9a2e5ba5-…f94d8 | renter | 2 | 2 |
| d65d48d2-…16335 | owner | 0 | 0 |
| 7c158cdc-…4e07 | owner | 0 | 0 |
| c83740b3-…2b2f4 | admin | 0 | 0 |
| 3 renter lain | renter | 0 | 0 |

Jenis notifikasi yang ada: `deposit_diterima`, `pembayaran_diverifikasi` (keduanya notifikasi untuk penyewa).

Secara eksplisit: **notifikasi staf (Owner/Admin) hasil uji Phase 1 sudah tidak ada di database** — terhapus saat pembersihan data uji Phase 1. Tidak ada satu pun baris notifikasi milik Owner.

## 3. User Role Match
Ya. Kedua akun owner terdaftar dengan role `owner` di `user_roles`. Fan-out Phase 1 memang seharusnya membuat notifikasi untuk kedua ID tersebut — tetapi hanya ketika ada pembayaran baru berstatus "menunggu verifikasi". Saat ini seluruh 13 pembayaran berstatus `lunas`, jadi tidak ada pemicu yang menghasilkan notifikasi staf setelah pembersihan.

## 4. RLS Result
Policy SELECT masih persis seperti Phase 1: `notifications_select_own` → `user_id = auth.uid()` untuk role `authenticated`. RLS tidak memblokir apa pun secara keliru; ia mengizinkan Owner membaca baris miliknya — hanya saja Owner tidak memiliki baris. Tidak ada perubahan policy.

## 5. Helper Result
`src/lib/notifications.ts` menanyakan `from("notifications")` tanpa filter user manual dan sepenuhnya mengandalkan RLS:
- `ambilNotifikasiSaya` → urut `created_at DESC`, opsi `is_read=false` dan `limit`. Untuk Owner: mengembalikan array kosong (bukan error).
- `ambilNotifikasiTerbaru(5)` → memanggil helper di atas: kosong.
- `hitungNotifikasiBelumDibaca` → HEAD + `count=exact`, filter `is_read=false`: mengembalikan 0.

Tidak ada filter tambahan berbasis role/user yang bisa salah. Hasil kosong karena memang tidak ada data, bukan karena query salah.

## 6. React Query Result
Query berjalan. Bukti: permintaan jaringan terbaru dari sesi login menunjukkan `HEAD /rest/v1/notifications?select=id&is_read=eq.false` dengan status **200** (bukan 401/403). Kueri berada di dalam subtree `_authenticated`, jadi sesi sudah tersedia sebelum komponen dirender; query bell (daftar) memang `enabled: buka` sehingga hanya jalan saat bell diklik — itu perilaku yang disengaja, bukan penyebab kosong. Tidak ada error, tidak ada masalah key/cache; data memang kosong.

## 7. UI Result
Dropdown dan halaman `/dashboard/notifications` menampilkan "Belum ada notifikasi" karena hasil query benar-benar kosong (0 baris, unread 0), sehingga badge angka juga tidak muncul. Error state terpisah dari empty state: `isError` menampilkan "Notifikasi belum dapat dimuat." + "Coba lagi", jadi kegagalan query tidak disalahartikan sebagai kosong.

## 8. Root Cause
**A. Data database memang tidak ada.**
Notifikasi milik Owner tidak pernah ada lagi setelah data uji Phase 1 dibersihkan, dan belum ada peristiwa baru yang memicu fan-out (tidak ada pembayaran berstatus "menunggu verifikasi"). Bukan masalah RLS, auth UID, helper, React Query, atau rendering. Laporan Phase 1 yang menyebut "ada notifikasi belum dibaca" benar untuk notifikasi penyewa, bukan untuk Owner.

## 9. Recommended Fix
Perbaikan terkecil: **tidak ada perubahan kode yang dibutuhkan.** UI sudah benar.

Untuk memverifikasi tampilan Owner, cukup lakukan satu alur bisnis nyata:
1. Login sebagai penyewa (`renter123@gmail.com`) → kirim satu bukti pembayaran, atau admin membuat pembayaran berstatus "menunggu verifikasi".
2. Trigger `payments_notify_pending` akan membuat notifikasi untuk kedua Owner dan Admin.
3. Login sebagai Owner → bell menampilkan badge dan daftar.
4. Setelah verifikasi/penolakan pembayaran, alur data uji dapat dibersihkan lagi bila diinginkan.

Opsional untuk cakupan berikutnya (bukan bagian Phase 2): Phase 3 reminder (kontrak berakhir, tunggakan, perawatan jatuh tempo) akan membuat notifikasi Owner/Admin muncul tanpa harus menunggu pembayaran masuk.

## 10. File Yang Terdampak
Bila nanti Anda menyetujui perbaikan, kandidat file:
- `src/lib/notifications.ts` — hanya jika ingin menambah fallback/opsi baru (saat ini tidak perlu).
- `src/components/notifikasi/BelNotifikasi.tsx` — hanya jika ingin daftar dropdown ikut di-prefetch tanpa membuka bell.
- Tidak ada file database/migration yang perlu diubah untuk masalah ini.
