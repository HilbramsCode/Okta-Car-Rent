# Draft Final Migrasi A (R1 + R2) — dengan keputusan T2 (pratinjau deposit khusus staf)

Selama penyusunan draft ini tidak ada perubahan yang diterapkan: tidak ada migrasi, kode, fungsi, ACL, policy, maupun konfigurasi yang diubah, dan Build tidak dijalankan. Semua bukti berasal dari pembacaan katalog dan kode sumber. Migrasi B (R4) dan R3 tidak termasuk di sini.

## 1. Ringkasan perubahan draft
- `deposit_settlement_preview` sekarang **khusus staf**. Jalur `owns_deposit` dihapus. Pemeriksaan dilakukan sebelum data dibaca, dan pemanggil yang bukan staf ditolak dengan `42501 'Akses ditolak.'`. Rumus perhitungan tidak berubah.
- Bagian lain sama dengan review sebelumnya: R1 dicabut dari PUBLIC/anon/authenticated; R2 dicabut dari PUBLIC/anon, sementara authenticated tetap (dipertahankan oleh `CREATE OR REPLACE`).
- **Pemanggil `deposit_settlement_preview` (sudah dicek):**
  - Di aplikasi hanya `ambilDetailDeposit` dan `prosesPengembalian` di `src/lib/deposits.ts`. Keduanya hanya dipakai oleh `src/routes/_authenticated/dashboard/admin/deposits/$id.tsx`, yang merupakan halaman staf.
  - Di database tidak ada fungsi lain yang memanggilnya.
  - Halaman Renter (`renter_.deposits.tsx`) memakai `ambilDepositSaya`. **Tidak ada halaman Renter yang terdampak.**
- Fungsi di luar keenam target, `promote_renter_to_admin`, `handle_new_user`, job cron, RLS, dan storage tidak disentuh.

## 2. SQL final Migrasi A (tanpa BEGIN/COMMIT)
```sql
REVOKE EXECUTE ON FUNCTION public.jalankan_pemeriksaan_harian_sistem() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_overdue_contracts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_deposit_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_renter_eligibility(_renter_id uuid, _start date, _end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.renters%ROWTYPE;
  v_blocks text[] := '{}';
  v_warns text[] := '{}';
  v_arrears numeric := 0;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO r FROM public.renters WHERE id = _renter_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'blocks', ARRAY['Penyewa tidak ditemukan.'], 'warnings', '{}'::text[], 'arrears', 0);
  END IF;

  IF NOT r.is_active THEN
    v_blocks := v_blocks || 'Penyewa berstatus nonaktif.';
  END IF;
  IF r.verification_status <> 'terverifikasi' THEN
    v_blocks := v_blocks || 'Penyewa belum diverifikasi.';
  END IF;
  IF r.id_card_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen KTP belum diunggah.';
  END IF;
  IF r.driving_license_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen SIM belum diunggah.';
  END IF;
  IF r.driving_license_expiry IS NOT NULL AND r.driving_license_expiry < COALESCE(_end, CURRENT_DATE) THEN
    v_blocks := v_blocks || 'SIM kedaluwarsa sebelum masa sewa berakhir.';
  END IF;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_arrears
  FROM public.outstanding_payments
  WHERE renter_id = _renter_id AND status <> 'lunas';

  IF v_arrears > 0 THEN
    v_blocks := v_blocks || ('Penyewa memiliki tunggakan Rp ' || to_char(v_arrears, 'FM999G999G999') || '.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts
    WHERE renter_id = _renter_id AND status IN ('aktif', 'terlambat')
  ) THEN
    v_warns := v_warns || 'Penyewa masih memiliki kontrak berjalan.';
  END IF;

  RETURN jsonb_build_object(
    'eligible', array_length(v_blocks, 1) IS NULL,
    'blocks', to_jsonb(v_blocks),
    'warnings', to_jsonb(v_warns),
    'arrears', v_arrears
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.check_renter_eligibility(uuid, date, date) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.deposit_settlement_preview(_deposit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  v_potongan numeric;
  v_tunggakan numeric;
  v_usulan numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Deposit tidak ditemukan.');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_potongan
  FROM public.deposit_deductions WHERE deposit_id = _deposit_id;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_tunggakan
  FROM public.outstanding_payments
  WHERE renter_id = d.renter_id AND status <> 'lunas';

  v_usulan := LEAST(v_tunggakan, GREATEST(0, d.amount - v_potongan));

  RETURN jsonb_build_object(
    'deposit', d.amount,
    'potongan', v_potongan,
    'sisa', GREATEST(0, d.amount - v_potongan),
    'tunggakan', v_tunggakan,
    'usulan_potongan_tunggakan', v_usulan,
    'nominal_pengembalian', GREATEST(0, d.amount - v_potongan - v_usulan)
  );
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.deposit_settlement_preview(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.contract_billing_summary(_contract_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total', COALESCE(c.total_amount, 0),
    'paid', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0),
    'pending', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'menunggu_verifikasi'
    ), 0),
    'remaining', GREATEST(0, COALESCE(c.total_amount, 0) - COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0))
  )
  FROM public.contracts c
  WHERE c.id = _contract_id
    AND (public.is_staff(auth.uid()) OR public.owns_contract(c.id));
$function$;
REVOKE EXECUTE ON FUNCTION public.contract_billing_summary(uuid) FROM PUBLIC, anon;
```

## 3. SQL rollback A (migrasi baru, tanpa BEGIN/COMMIT)
Role yang menjalankan rollback adalah `postgres`, sama dengan grantor ACL asli. Buktinya: ACL `promote_renter_to_admin` yang dibuat migrasi pilot 0001 tercatat `authenticated=X/postgres`. `CREATE OR REPLACE` mempertahankan pemilik `postgres` dan ACL.
```sql
GRANT EXECUTE ON FUNCTION public.jalankan_pemeriksaan_harian_sistem() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_contracts() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_deposit_status(uuid) TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_renter_eligibility(uuid, date, date) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deposit_settlement_preview(uuid) TO PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contract_billing_summary(uuid) TO PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.check_renter_eligibility(_renter_id uuid, _start date, _end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.renters%ROWTYPE;
  v_blocks text[] := '{}';
  v_warns text[] := '{}';
  v_arrears numeric := 0;
BEGIN
  SELECT * INTO r FROM public.renters WHERE id = _renter_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible', false, 'blocks', ARRAY['Penyewa tidak ditemukan.'], 'warnings', '{}'::text[], 'arrears', 0);
  END IF;

  IF NOT r.is_active THEN
    v_blocks := v_blocks || 'Penyewa berstatus nonaktif.';
  END IF;
  IF r.verification_status <> 'terverifikasi' THEN
    v_blocks := v_blocks || 'Penyewa belum diverifikasi.';
  END IF;
  IF r.id_card_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen KTP belum diunggah.';
  END IF;
  IF r.driving_license_url IS NULL THEN
    v_blocks := v_blocks || 'Dokumen SIM belum diunggah.';
  END IF;
  IF r.driving_license_expiry IS NOT NULL AND r.driving_license_expiry < COALESCE(_end, CURRENT_DATE) THEN
    v_blocks := v_blocks || 'SIM kedaluwarsa sebelum masa sewa berakhir.';
  END IF;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_arrears
  FROM public.outstanding_payments
  WHERE renter_id = _renter_id AND status <> 'lunas';

  IF v_arrears > 0 THEN
    v_blocks := v_blocks || ('Penyewa memiliki tunggakan Rp ' || to_char(v_arrears, 'FM999G999G999') || '.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts
    WHERE renter_id = _renter_id AND status IN ('aktif', 'terlambat')
  ) THEN
    v_warns := v_warns || 'Penyewa masih memiliki kontrak berjalan.';
  END IF;

  RETURN jsonb_build_object(
    'eligible', array_length(v_blocks, 1) IS NULL,
    'blocks', to_jsonb(v_blocks),
    'warnings', to_jsonb(v_warns),
    'arrears', v_arrears
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.contract_billing_summary(_contract_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'total', COALESCE(c.total_amount, 0),
    'paid', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0),
    'pending', COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'menunggu_verifikasi'
    ), 0),
    'remaining', GREATEST(0, COALESCE(c.total_amount, 0) - COALESCE((
      SELECT SUM(p.amount) FROM public.payments p
      WHERE p.contract_id = c.id AND p.status = 'lunas'
    ), 0))
  )
  FROM public.contracts c WHERE c.id = _contract_id;
$function$;

CREATE OR REPLACE FUNCTION public.deposit_settlement_preview(_deposit_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  d public.deposits%ROWTYPE;
  v_potongan numeric;
  v_tunggakan numeric;
  v_usulan numeric;
BEGIN
  SELECT * INTO d FROM public.deposits WHERE id = _deposit_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Deposit tidak ditemukan.');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_potongan
  FROM public.deposit_deductions WHERE deposit_id = _deposit_id;

  SELECT COALESCE(SUM(GREATEST(0, amount_due - amount_paid)), 0) INTO v_tunggakan
  FROM public.outstanding_payments
  WHERE renter_id = d.renter_id AND status <> 'lunas';

  v_usulan := LEAST(v_tunggakan, GREATEST(0, d.amount - v_potongan));

  RETURN jsonb_build_object(
    'deposit', d.amount,
    'potongan', v_potongan,
    'sisa', GREATEST(0, d.amount - v_potongan),
    'tunggakan', v_tunggakan,
    'usulan_potongan_tunggakan', v_usulan,
    'nominal_pengembalian', GREATEST(0, d.amount - v_potongan - v_usulan)
  );
END;
$function$;
```
Fungsi R1 tidak diubah isinya oleh Migrasi A, sehingga rollback hanya mengembalikan ACL-nya. Definisinya tetap sama, dan md5 dipakai untuk membuktikannya.

## 4. Tabel ACL dan hash
Semua fungsi dimiliki `postgres`. ACL sebelum migrasi sama untuk keenamnya:
`{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}`

| Fungsi | md5 `pg_get_functiondef` sebelum | ACL sesudah A | Isi berubah? |
|---|---|---|---|
| jalankan_pemeriksaan_harian_sistem() | 2822d9930f3928c5e4a18bbf2705b7e3 | `{postgres=X/postgres, service_role=X/postgres}` | Tidak |
| mark_overdue_contracts() | 710f1e15709c447a7f2e9721261f421d | `{postgres=X/postgres, service_role=X/postgres}` | Tidak |
| recalc_deposit_status(uuid) | 119d069ca8e2466e655c12031ac88576 | `{postgres=X/postgres, service_role=X/postgres}` | Tidak |
| check_renter_eligibility(uuid,date,date) | 47870f178b4dbed3a577707df6fc9b14 | `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}` | Ya (khusus staf) |
| deposit_settlement_preview(uuid) | eb6521d45b7100f5baf16567bb4f789b | `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}` | Ya (khusus staf) |
| contract_billing_summary(uuid) | 42684c390cf72eb31cd59d8e6c67c29c | `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}` | Ya (staf/pemilik) |

Setelah rollback: ACL dan md5 harus kembali ke kolom "sebelum".

## 5. Query verifikasi (read-only)
```sql
-- Setelah penerapan dan setelah rollback
SELECT p.proname, p.proowner::regrole AS owner, p.prosecdef, p.proconfig,
       md5(pg_get_functiondef(p.oid)) AS md5,
       (SELECT array_agg(coalesce(g.rolname,'PUBLIC') || ':' || a.privilege_type || ':' || gr.rolname ORDER BY 1)
          FROM aclexplode(p.proacl) a
          LEFT JOIN pg_roles g ON g.oid = a.grantee
          JOIN pg_roles gr ON gr.oid = a.grantor) AS acl_set
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN
 ('jalankan_pemeriksaan_harian_sistem','mark_overdue_contracts','recalc_deposit_status',
  'check_renter_eligibility','deposit_settlement_preview','contract_billing_summary');

-- Kontrol: objek di luar cakupan tidak berubah
SELECT proname, proacl::text, md5(pg_get_functiondef(oid)) FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('promote_renter_to_admin','handle_new_user','periksa_kontrak_harian',
                  'apply_deposit_damage_deduction','sync_deposit_status');
SELECT jobname, schedule, active, username FROM cron.job;
SELECT status, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 3;
```
Nilai kontrol yang dicatat sebelum migrasi:
- `promote_renter_to_admin` ACL `{postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}`
- `handle_new_user` ACL `{postgres=X/postgres, service_role=X/postgres}`
- md5 `periksa_kontrak_harian` a21fe698…, `apply_deposit_damage_deduction` b222031c…, `sync_deposit_status` c2e76d4f…
- Job: 1 baris `0 22 * * *`, aktif, berjalan sebagai `postgres`

## 6. Matriks tes
**Sudah dijalankan (read-only):**
| Tes | Status | Bukti |
|---|---|---|
| ACL dan pemilik keenam fungsi sebelum migrasi | Tercatat | Katalog `pg_proc.proacl` |
| md5 definisi sebelum migrasi | Tercatat | Tabel bagian 4 |
| Role migrasi = postgres | PASS | Grantor ACL hasil migrasi 0001 |
| Pemanggil pratinjau deposit hanya halaman staf | PASS | `rg`: hanya `deposits.ts` → `admin/deposits/$id.tsx`; DB: 0 fungsi pemanggil |
| Halaman Renter tidak memakai pratinjau | PASS | `renter_.deposits.tsx` memakai `ambilDepositSaya` |
| Pemanggil internal dan job milik/berjalan sebagai postgres | PASS | Katalog dan `cron.job` |
| Transaksi atomik migrator | PASS (kode sumber) | `drizzle-orm/pg-core/dialect.js` baris 60–70 |

**Direncanakan (belum dijalankan, tanpa status PASS):**
| Peran | Tes | Diharapkan |
|---|---|---|
| Owner | Buka detail deposit | Pratinjau penyelesaian tampil |
| Admin | Buka detail deposit; catat potongan; proses pengembalian | Pratinjau tampil; potongan tercatat; status deposit terhitung ulang |
| Admin | Form kontrak, pilih penyewa | Blokir/peringatan kelayakan tampil |
| Owner/Admin | Dashboard (pemeriksaan harian otomatis) | Tanpa error |
| Renter (API) | `deposit_settlement_preview` untuk deposit sendiri dan milik orang lain | Keduanya `42501 Akses ditolak.` |
| Renter (API) | `check_renter_eligibility`; `contract_billing_summary` kontrak orang lain / sendiri | Ditolak / `NULL` / data sendiri |
| Renter (UI) | Halaman deposit, kontrak, pembayaran | Normal |
| Anon (API) | Panggil keenam fungsi | `permission denied` |
| Job harian | Run 05:00 WIB berikutnya | `succeeded` |
| Katalog | Query bagian 5 setelah penerapan dan setelah rollback | Sesuai tabel bagian 4 |

## 7. Risiko atau penghambat yang tersisa
- Tidak ada penghambat untuk Migrasi A.
- Risiko kecil: kecocokan md5 setelah rollback hanya terjamin bila teks fungsi disalin byte demi byte. Teks rollback di atas diambil langsung dari `pg_get_functiondef`, tetapi kecocokan md5-nya baru bisa dibuktikan setelah rollback benar-benar dijalankan.
- Migrasi B tetap NOT READY (izin storage) dan berada di luar draft ini.

## 8. Keputusan akhir
**Migrasi A: READY FOR APPROVAL.** Draft ini tidak diterapkan. Penerapan hanya dilakukan setelah Anda memberikan persetujuan eksplisit.

---

## 9. Pemeriksaan akhir rollback (read-only)

### Hasil
| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Isi asli 3 fungsi R2 dipulihkan byte demi byte | **PASS (statis)** | md5 isi fungsi (`prosrc`) saat ini = md5 teks di rollback: `check_renter_eligibility` f52365e1… (1675 karakter), `contract_billing_summary` 2fb1854e… (613), `deposit_settlement_preview` 1fc78d1f… (918). Header (`RETURNS`, `LANGUAGE`, `STABLE SECURITY DEFINER`, `search_path`) juga identik. Perilaku bisnisnya sama persis dengan aslinya |
| Isi 3 fungsi R1 | **PASS** | Tidak diubah oleh Migrasi A maupun rollback |
| Pemilik setelah rollback | **PASS** | `CREATE OR REPLACE` dan GRANT/REVOKE tidak mengubah `proowner` (postgres) |
| Himpunan ACL setelah rollback | **PASS (statis)** | Migrasi A hanya mencabut PUBLIC/anon (+authenticated untuk R1). Rollback memberikan kembali tepat entri itu. Entri `postgres` dan `service_role` tidak pernah disentuh. Hasilnya, himpunan ACL = `{PUBLIC, postgres, anon, authenticated, service_role}`, semuanya EXECUTE dengan grantor `postgres`. Tidak ada hak yang bertambah atau hilang |
| Grantor | **PASS (bukti tidak langsung)** | Migrasi pilot 0001 menghasilkan grantor `postgres`, jadi migrasi berjalan sebagai `postgres` |
| ACL NULL | Tidak berlaku saat ini | Keenam fungsi `proacl IS NOT NULL`. Jika ACL NULL, PostgreSQL memakai `acldefault('f', owner)` = `{=X/postgres, postgres=X/postgres}`. Kondisi awal **bukan** default, jadi rollback tidak boleh "mengosongkan" ACL, dan memang tidak melakukannya |
| Urutan teks ACL | Catatan | Setelah REVOKE lalu GRANT, urutan entri dalam array `proacl` bisa berbeda dari aslinya (misalnya PUBLIC berpindah ke belakang). Isinya sama, tetapi teks `proacl::text` mungkin tidak identik. Karena itu ACL harus dibandingkan sebagai himpunan, bukan sebagai teks |
| md5 `pg_get_functiondef` | Catatan | Karena isi dan header identik, md5 diharapkan kembali ke nilai di bagian 4. Ini baru terbukti setelah rollback benar-benar dijalankan |

### Perbaikan query verifikasi (menggantikan query ACL di bagian 5)
Query di bagian 5 punya dua kelemahan:
1. Tidak menangani ACL NULL, karena `aclexplode(NULL)` tidak menghasilkan baris.
2. `ORDER BY 1` di dalam `array_agg` mengurutkan berdasarkan konstanta, sehingga urutannya tidak dijamin.

PUBLIC sudah ditangani dengan benar (grantee oid 0 → `LEFT JOIN` → 'PUBLIC'). Query pengganti:
```sql
SELECT p.proname,
       p.proowner::regrole AS owner,
       p.proacl IS NULL AS acl_null,
       md5(pg_get_functiondef(p.oid)) AS def_md5,
       md5(p.prosrc) AS src_md5,
       (SELECT string_agg(e, ', ' ORDER BY e) FROM (
          SELECT coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type || ':' || gr.rolname
                 || CASE WHEN a.is_grantable THEN ':grantable' ELSE '' END AS e
          FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
          LEFT JOIN pg_roles g  ON g.oid  = a.grantee
          JOIN      pg_roles gr ON gr.oid = a.grantor) s) AS acl_set
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN
 ('jalankan_pemeriksaan_harian_sistem','mark_overdue_contracts','recalc_deposit_status',
  'check_renter_eligibility','deposit_settlement_preview','contract_billing_summary')
ORDER BY 1;
```
`acl_set` yang diharapkan sebelum migrasi dan setelah rollback (keenam fungsi), dengan `acl_null = false`:
`PUBLIC:EXECUTE:postgres, anon:EXECUTE:postgres, authenticated:EXECUTE:postgres, postgres:EXECUTE:postgres, service_role:EXECUTE:postgres`

Setelah Migrasi A:
- R1: `postgres:EXECUTE:postgres, service_role:EXECUTE:postgres`
- R2: `authenticated:EXECUTE:postgres, postgres:EXECUTE:postgres, service_role:EXECUTE:postgres`

`src_md5` setelah rollback harus sama dengan nilai sebelum migrasi:

| Fungsi | `src_md5` |
|---|---|
| check_renter_eligibility | f52365e1c83ba2b426160a106ff96d51 |
| contract_billing_summary | 2fb1854e83cfdd4e149479f509cea55b |
| deposit_settlement_preview | 1fc78d1fb227c9c863a3d9035dcb1233 |
| jalankan_pemeriksaan_harian_sistem | 7e71bffcc91d7bd90fa5e6a2b126d172 |
| mark_overdue_contracts | 0e3bbcf81de940f61fc1e9915759530e |
| recalc_deposit_status | 5ac140891499d5d135ed362fe0b8ff1a |

### Kesimpulan
SQL Migrasi A dan rollback-nya **aman untuk disetujui**. Rollback memulihkan isi fungsi byte demi byte (dibuktikan dengan md5) serta himpunan ACL yang sama, termasuk pemilik dan grantor.

Yang belum bisa diverifikasi tanpa penerapan:
1. Semua tes runtime (Owner, Admin, Renter, anon, dan job 05:00 WIB). Statusnya belum dijalankan, bukan PASS.
2. Kecocokan md5 `pg_get_functiondef` dan himpunan ACL secara nyata setelah rollback.
3. Grantor `postgres` pada rollback hanya dibuktikan secara tidak langsung, dari hasil migrasi 0001.
4. Urutan teks `proacl` mungkin berbeda dari aslinya; isinya tetap sama.

Tidak ada perubahan yang diterapkan selama pemeriksaan ini.
