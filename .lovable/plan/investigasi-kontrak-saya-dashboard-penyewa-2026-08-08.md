# Investigasi "Kontrak Saya" — Dashboard Penyewa

## Status

**B** — Data kontrak dan izin akses (RLS) untuk penyewa sudah tersedia dan aman, tetapi belum ada halaman, menu, maupun query khusus penyewa untuk kontraknya sendiri.

## Data yang sudah tersedia

- Tabel `contracts` punya kolom `renter_id -> renters.id`, dan `renters.user_id -> auth.users.id`. Jadi rantai relasi akun login → penyewa → kontrak sudah ada.
- Fungsi database `owns_renter(renter_id)` (security definer) sudah dipakai untuk membatasi baris milik penyewa.
- Kontrak menyimpan status pada enum `contract_status` (`draft`, `aktif`, `terlambat`, `selesai`, `dibatalkan`), plus riwayat perubahan di `contract_status_history`. Satu penyewa memang bisa punya lebih dari satu kontrak (contoh data saat ini: satu penyewa dengan 2 kontrak).
- Di `src/lib/contracts.ts` sudah ada logika yang bisa dipakai ulang: `ambilDaftarKontrak` (daftar + rekap), `ambilDetailKontrak` (detail), `hitungDurasi`, `tarifDariSnapshot`, `dendaKeterlambatan`.

## Route/UI yang sudah tersedia

Sudah ada:
- `/dashboard/renter` (menu Pembayaran Saya + Deposit Saya)
- `/dashboard/renter/payments`
- `/dashboard/renter/deposits`

Belum ada:
- Route `/dashboard/renter/contracts` (tidak ada file `renter_.contracts.tsx`)
- Komponen daftar/detail kontrak versi penyewa. Komponen kontrak yang ada (`FormKontrak`, halaman `dashboard/admin/contracts/*`) semuanya berorientasi admin (aksi ubah, aktifkan, batalkan) dan tidak layak dipakai apa adanya oleh penyewa.
- Tidak ada komponen kontrak "sudah dibuat tapi belum dipakai".

## Authorization/RLS

Kebijakan aktif saat ini:
- `contracts`: SELECT `owns_renter(renter_id) OR is_staff(auth.uid())`; tulis hanya staf (`contracts_staff_write`).
- `payments`: SELECT `owns_contract(contract_id) OR is_staff(...)`.
- `deposits`: SELECT `owns_renter(renter_id) OR is_staff(...)`.
- `renters`: SELECT `user_id = auth.uid() OR is_staff(...)`.

Artinya penyewa **sudah** hanya bisa membaca kontraknya sendiri di tingkat database. Halaman "Pembayaran Saya" dan "Deposit Saya" memang mengandalkan pola ini: query-nya tidak menyaring per pengguna di sisi aplikasi, RLS yang memfilter baris. Pola yang sama bisa langsung dipakai untuk kontrak — tanpa RPC baru dan tanpa melonggarkan kebijakan tabel `contracts`.

## Yang masih kurang

1. Query khusus penyewa di `src/lib/contracts.ts` (mis. `ambilKontrakSaya`) yang hanya memilih kolom aman untuk penyewa dan mengandalkan RLS, tanpa rekap milik admin.
2. Route `src/routes/_authenticated/dashboard/renter_.contracts.tsx` dengan `RoleGate allow="renter"`.
3. Kartu/menu "Kontrak Saya" di `/dashboard/renter`.
4. Tampilan detail satu kontrak versi penyewa (read-only).

## Rekomendasi implementasi minimal

- Tambah `ambilKontrakSaya()` di `src/lib/contracts.ts`: `from("contracts").select(...)` tanpa filter pengguna manual (RLS yang membatasi), diurutkan `start_date` menurun, join ringan ke `vehicles` (merek, model, plat) saja.
- Tambah route `/dashboard/renter/contracts` dibungkus `RoleGate allow="renter"` di dalam `DashboardShell`, berisi daftar kartu kontrak: nomor kontrak, unit, periode, tipe sewa, status (StatusBadge), total, sisa/denda bila terlambat.
- Detail kontrak cukup di halaman yang sama (expand/kartu), atau route `renter_.contracts.$id.tsx` yang tetap memuat data lewat query ber-RLS — ID dari URL bukan satu-satunya pengaman, karena baris milik penyewa lain otomatis tidak terbaca.
- Tambah satu kartu "Kontrak Saya" di `/dashboard/renter` yang menaut ke route baru.
- Tidak perlu RPC baru, tidak perlu migrasi, tidak perlu perubahan kebijakan RLS.
- Jangan tampilkan kolom internal (mis. `created_by`, `approved_by`, catatan override) di tampilan penyewa.
