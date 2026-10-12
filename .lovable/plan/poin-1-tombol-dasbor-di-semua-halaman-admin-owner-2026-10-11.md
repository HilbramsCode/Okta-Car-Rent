# Poin 1 — Tombol "Dasbor" di semua halaman Admin & Owner

## Hasil pemeriksaan (read-only)

- Semua 40 halaman di area terautentikasi (Admin, Owner, Penyewa, Laporan, Analitik, Notifikasi) sudah memakai satu komponen bersama: `src/components/dashboard/DashboardShell.tsx`. Tidak ada halaman yang melewatinya.
- Header `DashboardShell` saat ini hanya berisi: Logo (tautan ke `/`), bel notifikasi, dan tombol Keluar. Tidak ada jalan kembali ke dashboard selain logo (yang justru mengarah ke halaman depan `/`, bukan dashboard).
- Fungsi `dashboardPathForRole(role)` sudah tersedia di `src/lib/auth.ts` (owner → `/dashboard/owner`, admin → `/dashboard/admin`, lainnya → `/dashboard/renter`), beserta hook `useUserRole(userId)` dan `useAuthSession()`.
- Rute tujuan (`/dashboard/owner`, `/dashboard/admin`) sudah ada, jadi tidak ada rute baru.

## Rencana perubahan minimum — 1 file

**`src/components/dashboard/DashboardShell.tsx`** (satu-satunya file yang diubah):

1. Ambil sesi dan role dengan hook yang sudah ada: `useAuthSession()` + `useUserRole(session?.user.id)`.
2. Tambahkan tombol "Dasbor" di header, di sebelah kiri bel notifikasi:
   - Memakai komponen `Button` (variant `outline`, size `lg`) dan ikon `LayoutDashboard` dari lucide — mengikuti gaya tombol Keluar yang sudah ada.
   - `onClick` menavigasi ke `dashboardPathForRole(role)` via `useNavigate` (pola yang sama dengan fungsi `keluar`).
   - Saat role masih dimuat, tombol dinonaktifkan sementara (mencegah navigasi ke tujuan yang salah).
   - Label "Dasbor" disembunyikan di layar sangat kecil (ikon tetap tampil) agar header tetap muat di mobile — pola responsif yang sama dengan halaman lain.

Karena semua halaman memakai komponen ini, tombol otomatis muncul di seluruh tab Admin dan Owner (juga Penyewa, yang diarahkan ke dashboard penyewa oleh fungsi yang sama).

## Yang TIDAK diubah

- Autentikasi, otorisasi, role, routing, database, trigger, migrasi — tidak disentuh.
- Tidak ada dashboard baru, tidak ada komponen yang diduplikasi.
- Pengamanan Poin 11 dan fitur lain tidak terpengaruh.

## Verifikasi setelah implementasi

1. Build OK.
2. Uji browser: login sebagai Admin → buka halaman Armada → tekan "Dasbor" → tiba di `/dashboard/admin`. Ulangi sebagai Owner dari halaman Kelola Pengguna → tiba di `/dashboard/owner`.
3. Periksa tampilan mobile (viewport kecil): tombol tetap terlihat dan tidak merusak header.
