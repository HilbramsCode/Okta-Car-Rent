# Final SQL Review — Migrasi R4 (policy UPDATE storage) — Read-only

Tidak ada yang dijalankan atau diubah: migrasi, rollback, policy, bucket, role, grant, dan kode tetap seperti semula. Inventaris diambil langsung dari `pg_policy` pada pilot. `supautils.policy_grants` untuk `postgres` mencakup `storage.objects` (sudah terverifikasi read-only).

## 1. Pencocokan dengan inventaris 12 policy
| Policy | Operasi | Role | USING (saat ini) | WITH CHECK (saat ini) | Diubah R4? |
|---|---|---|---|---|---|
| payment_proofs_read | SELECT | authenticated | bucket=payment-proofs AND (folder=uid OR is_staff) | — | Tidak |
| payment_proofs_insert | INSERT | authenticated | — | bucket=payment-proofs AND (folder=uid OR is_staff) | Tidak |
| **payment_proofs_update** | UPDATE | authenticated | bucket=payment-proofs AND (folder=uid OR is_staff) | NULL | **Ya** |
| payment_proofs_delete | DELETE | authenticated | bucket=payment-proofs AND is_staff | — | Tidak |
| renter_documents_read | SELECT | authenticated | bucket=renter-documents AND (folder=uid OR is_staff) | — | Tidak |
| renter_documents_insert | INSERT | authenticated | — | bucket=renter-documents AND (folder=uid OR is_staff) | Tidak |
| **renter_documents_update** | UPDATE | authenticated | bucket=renter-documents AND (folder=uid OR is_staff) | NULL | **Ya** |
| renter_documents_delete | DELETE | authenticated | bucket=renter-documents AND is_staff | — | Tidak |
| vehicle_photos_read | SELECT | authenticated | bucket=vehicle-photos | — | Tidak |
| vehicle_photos_staff_write | INSERT | authenticated | — | bucket=vehicle-photos AND is_staff | Tidak |
| vehicle_photos_staff_update | UPDATE | authenticated | bucket=vehicle-photos AND is_staff | — | Tidak |
| vehicle_photos_staff_delete | DELETE | authenticated | bucket=vehicle-photos AND is_staff | — | Tidak |

Hanya 2 dari 12 policy yang disentuh, dan keduanya UPDATE. Bucket, role, grant, dan kode aplikasi tidak berubah.

## 2. SQL R4 (tanpa BEGIN/COMMIT; migrator membungkus dalam satu transaksi)
```sql
DROP POLICY payment_proofs_update ON storage.objects;
CREATE POLICY payment_proofs_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs'::text AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'payment-proofs'::text AND public.is_staff(auth.uid()));

DROP POLICY renter_documents_update ON storage.objects;
CREATE POLICY renter_documents_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (bucket_id = 'renter-documents'::text AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'renter-documents'::text AND public.is_staff(auth.uid()));
```
Catatan desain:
- `DROP POLICY` sengaja **tanpa** `IF EXISTS`. Jika nama policy berbeda dari inventaris, migrasi gagal secara atomik dan tidak diam-diam membuat policy kedua.
- `WITH CHECK` ditambahkan agar staf pun tidak bisa memindahkan objek ke bucket lain lewat UPDATE.

## 3. SQL rollback (migrasi baru terpisah; rekonstruksi persis dari `pg_policy`)
```sql
DROP POLICY payment_proofs_update ON storage.objects;
CREATE POLICY payment_proofs_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'payment-proofs'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_staff(auth.uid())));

DROP POLICY renter_documents_update ON storage.objects;
CREATE POLICY renter_documents_update ON storage.objects
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'renter-documents'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_staff(auth.uid())));
```
Kesesuaian dengan aslinya: `polcmd = w` (UPDATE), `polpermissive = true`, `polroles = {authenticated}`, ekspresi USING ditulis persis sama, dan `polwithcheck = NULL` (tidak ada klausa WITH CHECK). `ALTER POLICY` tidak dipakai, karena tidak bisa menghapus WITH CHECK, sehingga rollback yang persis harus memakai DROP lalu CREATE.

Pembanding ekspresi sebelum migrasi dan setelah rollback (harus identik):
```sql
SELECT polname, polcmd, polpermissive,
       array(SELECT rolname FROM pg_roles WHERE oid = ANY(polroles)) AS roles,
       pg_get_expr(polqual, polrelid) AS using_expr,
       pg_get_expr(polwithcheck, polrelid) AS check_expr
FROM pg_policy WHERE polrelid = 'storage.objects'::regclass ORDER BY polname;
```
Kecocokan teks `pg_get_expr` setelah rollback diharapkan sama, karena PostgreSQL menormalkan ekspresinya. Bukti nyatanya baru ada setelah rollback dijalankan: **UNVERIFIED**.

## 4. Konflik nama, transaksi, dan izin
| Aspek | Penilaian | Status |
|---|---|---|
| Konflik nama | DROP lalu CREATE dengan nama yang sama di transaksi yang sama, jadi tidak ada duplikat. Kedua nama ada tepat satu kali di inventaris | VERIFIED (katalog) |
| Atomik | Migrator Drizzle menjalankan semua statement dalam satu transaksi (kode di `drizzle-orm/pg-core/dialect.js`). Jika gagal, kedua policy lama tetap utuh | VERIFIED (kode migrator) |
| Celah tanpa policy | Tidak ada. Transaksi lain tidak pernah melihat keadaan "sudah di-DROP tapi belum di-CREATE" | VERIFIED (semantik PostgreSQL) |
| Lock | DDL policy mengambil kunci eksklusif singkat pada `storage.objects`, sehingga unggah/baca file tertahan sesaat (milidetik). Data pilot masih kecil | Risiko rendah |
| Izin via supautils | `policy_grants` mencantumkan `postgres` → `storage.objects`; `supautils` dimuat lewat `session_preload_libraries` | Konfigurasi VERIFIED; **eksekusi UNVERIFIED** |
| supautils di dalam transaksi migrator | Secara desain berlaku per perintah DDL, termasuk di dalam transaksi | **UNVERIFIED** di pilot ini |
| Panggilan `public.is_staff` | Fungsi ada, SECURITY DEFINER, EXECUTE untuk authenticated (tidak diubah Migrasi A) | VERIFIED |

## 5. Dampak ke aplikasi
- **Owner/Admin:** tetap bisa unggah, baca, ganti, dan hapus dokumen penyewa serta bukti bayar (`is_staff`). Unggah dari halaman Admin memakai `upsert: false` (INSERT), jadi tidak bergantung pada UPDATE.
- **Renter:** unggah bukti bayar (INSERT ke folder `auth.uid()`) dan membaca miliknya tetap jalan. Yang hilang hanya kemampuan menimpa file, yang tidak dipakai aplikasi.
- **Dokumen KTP/SIM Renter:** ketidaksesuaian folder `{renterId}` vs `auth.uid()` masih ada (`src/lib/renters.ts:469`). Akibatnya Renter tidak bisa membaca dokumennya sendiri, baik sebelum maupun sesudah R4. R4 tidak memperbaiki atau memperburuk kondisi ini.
- **Foto kendaraan:** tidak tersentuh.

## 6. Tes pascamigrasi (belum dijalankan)
| # | Peran | Tes | Diharapkan |
|---|---|---|---|
| 1 | Katalog | Query bagian 3 | 2 policy UPDATE = is_staff + WITH CHECK; 10 lainnya identik dengan inventaris |
| 2 | Admin | Unggah dan lihat KTP/SIM di detail penyewa | Berhasil |
| 3 | Admin | Ganti berkas penyewa ("Ganti Berkas") | Berhasil (file baru via INSERT) |
| 4 | Owner/Admin | Lihat bukti bayar di verifikasi pembayaran | Tampil |
| 5 | Admin | Unggah bukti pengembalian deposit | Berhasil |
| 6 | Renter | Unggah bukti pembayaran baru | Berhasil |
| 7 | Renter | Lihat bukti bayar miliknya | Tampil |
| 8 | Renter (API) | UPDATE/menimpa file di folder uid miliknya | Ditolak (0 baris / error RLS) |
| 9 | Admin | Unggah, ganti utama, dan hapus foto kendaraan | Berhasil |
| 10 | Semua login | Lihat foto kendaraan | Tampil |
| 11 | Anon (API) | Baca atau tulis ketiga bucket | Ditolak |

Tes 8 membutuhkan sesi Renter sungguhan.

## 7. Asumsi UNVERIFIED
1. Migrator benar-benar bisa menjalankan `DROP/CREATE POLICY` pada `storage.objects` lewat supautils.
2. supautils berlaku di dalam transaksi migrator.
3. Teks `pg_get_expr` setelah rollback identik dengan aslinya.
4. Seluruh tes runtime di bagian 6.

## 8. Rekomendasi: **GO untuk diajukan ke persetujuan penerapan (bersyarat)**
- SQL hanya menyentuh 2 policy target, rollback-nya persis, dan kegagalan izin akan dibatalkan secara atomik tanpa lockout.
- Syarat: penerapan adalah langkah terpisah yang butuh persetujuan eksplisit Anda. Hasilnya sekaligus menjadi bukti untuk asumsi 1 dan 2.
- Jika migrasi gagal karena izin, statusnya menjadi NO-GO dan tidak ada yang berubah.
