# M-4 — SERVER-SIDE DAILY SCHEDULER AUDIT

MODE: investigasi. Tidak ada file sumber, migration, cron, RPC, RLS, atau privilege yang diubah pada fase ini.

## Current Architecture

- Stack: TanStack Start (React 19 + Vite), dideploy oleh Lovable ke runtime Worker (Cloudflare workerd). **Bukan Vercel** — tidak ada `vercel.json`, tidak ada `api/` folder gaya Vercel, tidak ada Vercel Cron.
- Backend: Lovable Cloud (Supabase, project ref internal). `supabase/config.toml` hanya berisi `project_id` — tidak ada blok `functions`, tidak ada Edge Function terdaftar, tidak ada scheduled job.
- Server-side code yang ada: `src/lib/public.functions.ts` (createServerFn, klien publishable read-only untuk armada publik) dan `src/server.ts` (SSR entry + error page). **Tidak ada** direktori `src/routes/api/`, jadi belum ada HTTP endpoint apa pun.
- Env convention: `process.env.SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` di server, `VITE_SUPABASE_*` di klien. Service role key tidak tersedia di Lovable Cloud.
- Database: extension `pg_cron` **belum terpasang**, `pg_net` **belum terpasang** (keduanya tersedia untuk diaktifkan di Supabase). Timezone database = **UTC**, `CURRENT_DATE` mengikuti UTC.

## Current Problem

Pemeriksaan harian hanya dipicu `PemicuPemeriksaanHarian` yang dipasang di dua rute: `/dashboard/admin` dan `/dashboard/owner`. Guard-nya `localStorage["okta:pemeriksaan-harian"]`. Jika tidak ada staf membuka dashboard pada suatu hari:

- kontrak yang melewati `end_date` tetap `aktif` (status tidak pernah pindah ke `terlambat`);
- notifikasi H-7, overdue kontrak, tunggakan jatuh tempo, dan pengingat perawatan tidak dibuat hari itu.

## Existing Daily Checker

| Lapisan | Sifat |
|---|---|
| `PemicuPemeriksaanHarian.tsx` | Browser-only: `useEffect`, `localStorage`, per-perangkat. Tidak dapat dipakai server-side. Sudah ter-isolasi error per pemeriksaan (ISSUE-5 selesai). |
| `periksaKontrakHarian()` (`src/lib/contracts.ts`) | Wrapper `supabase.rpc("periksa_kontrak_harian")` memakai klien browser → butuh sesi user. |
| `periksaTunggakanHarian()` (`src/lib/payments.ts`) | Idem, RPC `periksa_tunggakan_harian`. |
| `periksaPerawatanHarian()` (`src/lib/maintenance.ts`) | Idem, RPC `periksa_perawatan_harian`. |

Ketiga wrapper client-safe tetapi **tidak** server-callable apa adanya, karena RPC di bawahnya menuntut `auth.uid()` milik staf. Tidak ada dependensi browser di dalam logika bisnis — seluruh logika sudah ada di database, itu kabar baik untuk migrasi ke scheduler.

## Database Functions

| Function | Security | Owner | search_path | EXECUTE | Butuh auth.uid() | Guard | Aman tanpa sesi? |
|---|---|---|---|---|---|---|---|
| `mark_overdue_contracts()` | DEFINER | postgres | public | service_role, postgres | tidak | tidak ada | **ya** |
| `periksa_kontrak_harian()` | DEFINER | postgres | public | anon, authenticated, service_role, postgres | ya | `is_staff(auth.uid())` → EXCEPTION | tidak |
| `periksa_tunggakan_harian()` | DEFINER | postgres | public | (sama pola) | ya | `is_staff(auth.uid())` | tidak |
| `periksa_perawatan_harian()` | DEFINER | postgres | public | (sama pola) | ya | `is_staff(auth.uid())` | tidak |
| `is_staff(uuid)` | DEFINER, STABLE | postgres | public | authenticated, service_role, postgres | — | — | — |

Ketiga `periksa_*` memakai `CURRENT_DATE` dan `ON CONFLICT DO NOTHING`, dan menulis notifikasi ber-`dedupe_key`.

## Current Auth Guard Analysis

Scheduler tanpa sesi (pg_cron sebagai postgres, atau service_role) akan memiliki `auth.uid() = NULL` → `is_staff(NULL)` = false → `RAISE EXCEPTION 'Akses ditolak.'`. Jadi ketiga RPC **tidak bisa** dipanggil langsung oleh scheduler.

Guard tidak boleh dihapus. Opsi aman: pisahkan logika ke fungsi internal tanpa guard yang **tidak** di-grant ke `anon`/`authenticated`, lalu:
- RPC staf existing tetap ada, tetap ber-guard, hanya memanggil fungsi internal;
- satu fungsi "runner" sistem memanggil fungsi internal yang sama, dan EXECUTE-nya hanya untuk `postgres`/`service_role`.

Konten notifikasi, dedupe, fan-out, dan return value tidak berubah karena SQL-nya dipindahkan apa adanya.

## Deployment Infrastructure

- A. Vercel? **Tidak.** Worker runtime via Lovable.
- B. Vercel Cron? Tidak ada.
- C. Supabase Edge Function? Tidak ada (dan pada stack ini kita tidak memakai Edge Function).
- D. Server endpoint aman? Belum ada; `/api/public/*` bisa dibuat bila diperlukan (bypass auth di edge, wajib verifikasi caller di handler).
- E. Scheduler infrastructure existing? **Tidak ada** (pg_cron & pg_net belum aktif).

## Scheduler Options

### Option A — Vercel Cron → API endpoint → RPC
Pros: familiar. Cons: **tidak berlaku**, project bukan di Vercel. Security/Complexity: n/a. Gugur.

### Option B — Cron eksternal / pg_net → route `/api/public/hooks/pemeriksaan-harian` → RPC
Pros: log terlihat di server function logs; mudah dipicu manual saat uji.
Cons: menambah permukaan HTTP publik; butuh secret/verifikasi caller; dua titik gagal (DB → HTTP → DB); latensi & cold start Worker; tetap butuh runner tanpa guard karena route tidak punya sesi staf.
Security: harus verifikasi header (`apikey` anon key adalah pola yang disetujui) + handler hanya boleh memanggil satu RPC runner, tidak menerima parameter arbitrer.
Complexity: MEDIUM.

### Option C — pg_cron di dalam database memanggil runner SQL (tanpa HTTP, tanpa pg_net)
Pros: tidak ada endpoint publik baru, tidak ada secret, tidak ada network hop, transaksional, jalan meski app down; semua logika sudah di database sehingga tidak ada duplikasi; observability lewat `cron.job_run_details`.
Cons: butuh mengaktifkan extension `pg_cron`; log tidak muncul di UI aplikasi (harus query tabel cron); jadwal dalam UTC.
Security: tertinggi — runner hanya EXECUTE untuk `postgres`/`service_role`, tidak ada rute yang bisa dipanggil pihak luar.
Complexity: LOW–MEDIUM.

### Option D — Infrastruktur existing
Tidak ada. Gugur.

## Recommended Architecture

**Option C.** pg_cron menjalankan satu fungsi runner `public.jalankan_pemeriksaan_harian_sistem()` sekali sehari; runner memanggil fungsi internal yang identik dengan isi RPC staf saat ini. Tidak ada HTTP endpoint, tidak ada secret, tidak ada service_role di browser, tidak ada perubahan RLS.

```text
pg_cron (22:00 UTC / 05:00 WIB)
  └─ jalankan_pemeriksaan_harian_sistem()   [DEFINER, EXECUTE: postgres+service_role]
       ├─ _periksa_kontrak_harian_inti()      (juga dipakai RPC staf ber-guard)
       ├─ _periksa_tunggakan_harian_inti()
       └─ _periksa_perawatan_harian_inti()
```

## Authentication Strategy

pg_cron berjalan sebagai role database, bukan user aplikasi → tidak butuh `auth.uid()`. Guard `is_staff` tetap utuh pada tiga RPC yang dipanggil klien. Runner tidak di-grant ke `anon`/`authenticated`, jadi tidak ada jalur bypass dari browser.

## Security Strategy

- `REVOKE ALL ON FUNCTION ... FROM PUBLIC, anon, authenticated` untuk runner dan tiga fungsi internal; GRANT hanya `postgres`, `service_role`.
- Tidak ada secret baru, tidak ada token di klien, tidak ada endpoint publik.
- Runner tidak menerima parameter — tidak mungkin dipakai untuk operasi arbitrer.
- Catatan tambahan: `periksa_*_harian` saat ini juga ter-grant ke `anon`; guard `is_staff` membuatnya tidak berguna bagi anon, tapi mencabut grant `anon` layak dipertimbangkan sebagai housekeeping terpisah (bukan bagian M-4).

## RLS Impact

Nol. Semua fungsi sudah `SECURITY DEFINER` dan berjalan sebagai owner `postgres`; policy `contracts`, `payments`, `outstanding_payments`, `maintenance_records`, `notifications` tidak disentuh. Tidak ada tabel yang perlu grant baru.

## Idempotency

Aman. Setiap notifikasi periodik memakai `dedupe_key` dengan unique index partial `notifications_user_dedupe_key_uniq (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`, dan setiap INSERT memakai `ON CONFLICT DO NOTHING`. `mark_overdue_contracts()` sendiri idempoten (`WHERE status='aktif' AND end_date < CURRENT_DATE`). Menjalankan dua kali sehari hanya menghasilkan 0 baris tambahan.

## Concurrent Execution

Dua eksekusi hampir bersamaan tetap aman: unique index memaksa satu pemenang, yang kalah tertelan `ON CONFLICT DO NOTHING`; UPDATE overdue idempoten pada baris yang sama. Risiko sisa hanya `unique_violation` bila ada INSERT tanpa `ON CONFLICT` di jalur yang sama — tidak ditemukan pada tiga fungsi ini. **Requirement opsional (bukan blocker):** `pg_try_advisory_xact_lock` di awal runner supaya eksekusi ganda langsung keluar; belum diperlukan, dicatat saja.

## Retry Behavior

Logika berbasis `CURRENT_DATE`, bukan "delta sejak run terakhir", jadi jika hari ini gagal, run besok otomatis mengejar: kontrak lewat `end_date` tetap terdeteksi, tunggakan jatuh tempo tetap terdeteksi, perawatan terlambat tetap terdeteksi. Yang **tidak** bisa dikejar adalah notifikasi H-7 untuk hari yang terlewat — dedupe key `kontrak_h7:<id>:<end_date>` bersifat per kontrak (bukan per hari), sehingga notifikasi tetap terkirim satu kali pada run berikutnya selama kontrak masih dalam jendela 7 hari; jika hari yang terlewat adalah hari terakhir jendela, pesannya bergeser ke sisa hari terbaru. Tidak perlu sistem retry.

## Timezone

Database UTC. Rekomendasi: **`0 22 * * *` UTC = 05:00 WIB**. Alasan: `CURRENT_DATE` sudah berganti hari sejak 07:00 WIB kemarin, jadi jadwal 05:00 WIB tetap berada di tanggal UTC yang sama dan hasilnya konsisten; staf menemukan notifikasi sudah siap saat mulai kerja pagi; beban di luar jam operasional. Tidak ada setting timezone yang diubah.

## Client Checker Strategy

Rekomendasi: **Option 1 / 3 (dipertahankan sebagai fallback + immediate feedback).** `PemicuPemeriksaanHarian` biaya nol saat scheduler sudah jalan (semua INSERT tertelan dedupe, UPDATE 0 baris) dan memberi jaring aman bila cron mati. Menghapusnya (Option 2) tidak memberi keuntungan dan menghilangkan fallback. Tidak ada perubahan kode klien pada implementasi nanti.

## Notification Impact

Nihil, karena SQL notifikasi dipindahkan tanpa diedit: H-7 & overdue kontrak, tunggakan baru & jatuh tempo, perawatan immediate & terlambat tetap memakai `type`, `title`, `message`, `link_url`, `priority`, `dedupe_key`, dan fan-out owner/admin yang sama.

## Data Integrity

Runner hanya melakukan: UPDATE `contracts.status` `aktif → terlambat`, INSERT `notifications`, dan (di jalur tunggakan) update penanda pengingat yang sudah ada. Tidak membuat kontrak/pembayaran/tunggakan baru, tidak menyentuh deposit, vehicle, atau renter. Business rule tidak berubah.

## Observability

Minimum yang cukup:
1. `cron.job_run_details` untuk status/durasi/error setiap run.
2. Runner mengembalikan `jsonb` gabungan (`{kontrak:…, tunggakan:…, perawatan:…}`) dan mencatatnya ke tabel log ringan **atau** cukup `RAISE NOTICE` — keputusan diambil saat build; tanpa dashboard baru.
3. Verifikasi manual sesekali: `select * from cron.job_run_details order by start_time desc limit 10`.

## Estimated Implementation Scope

**LOW–MEDIUM.** Satu migration (aktifkan `pg_cron`, refactor tiga fungsi menjadi inti + wrapper ber-guard, tambah runner, atur privileges), satu perintah `cron.schedule`. Nol perubahan file sumber, nol dependency baru, nol perubahan RLS/UI.

## Recommended Build Plan

1. Aktifkan extension `pg_cron` (pg_net tidak diperlukan).
2. Ekstrak isi `periksa_kontrak_harian`, `periksa_tunggakan_harian`, `periksa_perawatan_harian` ke tiga fungsi internal tanpa guard, byte-identik pada logika notifikasi.
3. Ubah ketiga RPC existing menjadi wrapper: guard `is_staff(auth.uid())` lalu panggil fungsi inti; signature & return value tetap agar `src/lib/*` tidak perlu diubah.
4. Tambah `public.jalankan_pemeriksaan_harian_sistem()` (DEFINER, `search_path=public`) yang memanggil tiga fungsi inti dengan blok EXCEPTION terpisah per pemeriksaan (paritas isolasi error klien).
5. Privileges: REVOKE dari PUBLIC/anon/authenticated untuk fungsi inti + runner; GRANT ke `postgres`, `service_role`.
6. `cron.schedule('pemeriksaan-harian-okta', '0 22 * * *', $$select public.jalankan_pemeriksaan_harian_sistem()$$)`.
7. Verifikasi: jalankan runner manual dalam transaksi yang di-rollback, cek 0 duplikat saat dijalankan dua kali, cek RPC staf masih berfungsi dan tetap menolak non-staf, cek `cron.job_run_details` setelah run pertama.

## Decision

**RECOMMENDED** — Option C (pg_cron internal, tanpa endpoint publik dan tanpa secret). Menunggu approval sebelum implementasi.
