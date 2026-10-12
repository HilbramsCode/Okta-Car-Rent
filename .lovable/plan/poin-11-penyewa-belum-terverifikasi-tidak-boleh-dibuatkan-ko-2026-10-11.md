# Poin 11: Penyewa belum terverifikasi tidak boleh dibuatkan kontrak

## Hasil pemeriksaan jalur pembuatan kontrak
- Hanya ada dua tempat di aplikasi yang menulis penyewa ke kontrak, keduanya di `src/lib/contracts.ts`:
  - `buatKontrak` membuat kontrak baru (INSERT).
  - `perbaruiKontrakDraft` mengubah kontrak draft (UPDATE). Fungsi ini **selalu** mengirim `renter_id`, jadi penyewa pada draft bisa diganti ke penyewa yang belum terverifikasi.
- Perubahan kontrak lain (pembatalan, penimpaan status di baris 927 dan 986) tidak mengubah penyewa.
- Di database tidak ada fungsi atau trigger yang membuat kontrak. Policy `contracts_staff_write` membuka akses tulis ke semua staf, termasuk lewat API langsung.
- Kesimpulan: yang perlu dilindungi adalah **INSERT** dan **UPDATE yang mengganti penyewa**.

## Aturan yang diterapkan di database
Kontrak hanya boleh dibuat, atau penyewanya diganti, jika penyewa **terverifikasi dan aktif**. Satu-satunya pengecualian:
- pemanggil memiliki peran **Owner**, diperiksa dari sesi login di server lewat `has_role(auth.uid(),'owner')`, dan
- `override_type = 'pembuatan_kontrak'`, dan
- `override_reason` diisi minimal 10 karakter (ketentuan baru, mohon konfirmasi).

Konsekuensinya:
- Admin selalu ditolak.
- `override_type` yang terisi tidak dianggap sebagai bukti kewenangan.
- Pemanggil tanpa sesi login (sistem atau service) juga ditolak, karena tidak ada jalur sistem yang membuat kontrak.
- Penimpaan oleh Owner tercatat lewat kolom `override_by` dan `override_at` yang diisi otomatis oleh `validate_contract_override`, serta entri audit `contracts create` yang sudah ada.
- Pemeriksaan lain di `check_renter_eligibility` (dokumen, SIM, tunggakan) **tidak** dipindahkan ke database. Aturan itu tetap di UI agar aturan bisnis lain tidak berubah.

## SQL migrasi (`enforce_renter_eligibility_on_contract`)
```sql
CREATE OR REPLACE FUNCTION public.enforce_contract_renter_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status public.verification_status;
  v_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.renter_id IS NOT DISTINCT FROM OLD.renter_id THEN
    RETURN NEW;
  END IF;

  SELECT verification_status, is_active INTO v_status, v_active
  FROM public.renters WHERE id = NEW.renter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penyewa tidak ditemukan.' USING ERRCODE = '23503';
  END IF;

  IF v_status = 'terverifikasi' AND v_active THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'owner')
     AND NEW.override_type = 'pembuatan_kontrak'
     AND length(btrim(coalesce(NEW.override_reason, ''))) >= 10 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Penyewa belum terverifikasi atau nonaktif. Hanya Pemilik yang dapat menimpa aturan ini dengan alasan yang jelas.'
    USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_contract_renter_eligibility() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enforce_contract_renter_eligibility
BEFORE INSERT OR UPDATE OF renter_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_renter_eligibility();
```

## SQL rollback
```sql
DROP TRIGGER IF EXISTS trg_enforce_contract_renter_eligibility ON public.contracts;
DROP FUNCTION IF EXISTS public.enforce_contract_renter_eligibility();
```

## Dampak terhadap trigger yang sudah ada
- Trigger BEFORE dijalankan berurutan menurut nama. `trg_enforce_…` berjalan lebih dulu daripada `trg_prevent_contract_overlap` dan `trg_validate_contract_override`.
- Jika kontrak ditolak, seluruh INSERT dibatalkan. Akibatnya deposit otomatis, sinkron status kendaraan, riwayat status, dan audit (semuanya trigger AFTER) **tidak berjalan**. Itu memang yang diinginkan.
- Untuk kontrak yang sah tidak ada perubahan apa pun.
- Trigger lain, policy, dan fungsi `check_renter_eligibility` tidak diubah.
- Saat ini ada 0 kontrak dengan penyewa yang belum terverifikasi, jadi data lama aman.

## Perubahan kode (FormKontrak.tsx, kecil)
- Di langkah 0, tombol Lanjut ditolak jika `kelayakan.isPending` dengan pesan "Memeriksa kelayakan penyewa…".
- Tombol juga ditolak jika `kelayakan.isError` dengan pesan "Pemeriksaan kelayakan gagal. Coba lagi."
- Isi formulir yang lain tidak berubah. Butuh 1 Build.

## Tes penerimaan
1. Admin, penyewa belum terverifikasi: tombol Lanjut ditolak di UI. Panggilan INSERT lewat API juga ditolak (42501).
2. Admin, penyewa terverifikasi dan aktif: kontrak terbentuk, deposit otomatis terbentuk, status kendaraan sesuai alur yang ada.
3. Owner, penyewa belum terverifikasi, dengan alasan valid: kontrak terbentuk, `override_by` = Owner, ada entri audit.
4. Owner tanpa alasan, atau alasan kurang dari 10 karakter: ditolak.
5. Admin mengirim `override_type='pembuatan_kontrak'` lewat API: ditolak.
6. Admin mengganti penyewa pada draft ke penyewa yang belum terverifikasi: ditolak. Mengedit draft tanpa mengganti penyewa: berhasil.
7. Penyewa nonaktif yang sudah terverifikasi: ditolak, kecuali jalur penimpaan Owner.
8. Katalog: trigger aktif, dan fungsi tidak bisa dijalankan oleh anon atau authenticated.

Tes 1–7 membutuhkan penyewa uji yang belum terverifikasi. Saya hanya akan menjalankan tes yang memungkinkan tanpa membuat data baru, kecuali Anda mengizinkan.

## Yang perlu dikonfirmasi
- Batas minimal 10 karakter untuk alasan penimpaan. Jika tidak setuju, cukup "tidak kosong", sama seperti aturan sekarang.

---

# FINAL PRE-DEPLOYMENT REVIEW (read-only)

## Trigger pada `contracts` (dibaca dari katalog)
| Trigger | Waktu | Event | Mengubah kolom |
|---|---|---|---|
| contracts_updated_at | BEFORE | UPDATE | updated_at |
| trg_prevent_contract_overlap | BEFORE | INSERT, UPDATE OF vehicle_id/start_date/end_date/status | — (hanya menolak) |
| trg_validate_contract_override | BEFORE | INSERT, UPDATE | override_by, override_at, pricing_snapshot_at |
| audit_contracts | AFTER | INSERT/UPDATE/DELETE | — (menulis audit_logs) |
| contracts_status_history | AFTER | UPDATE | — |
| trg_create_deposit_on_contract | AFTER | INSERT | — (membuat deposit) |
| trg_create_outstanding_on_completion | AFTER | UPDATE OF status | — |
| trg_notify_contract_overdue | AFTER | UPDATE OF status | — |
| trg_sync_vehicle_status | AFTER | INSERT, UPDATE OF status | — |

Fungsi dan trigger baru belum ada (`fn_exists=false`, `trg_exists=false`), jadi tidak ada konflik nama.

`validate_contract_override`:
- Menolak jika `override_type` terisi tetapi alasannya kosong.
- Mengisi `override_by := COALESCE(NEW.override_by, auth.uid())` dan `override_at := COALESCE(NEW.override_at, now())`.

## Hasil pemeriksaan konflik
1. **Urutan.** Trigger BEFORE berjalan berurutan menurut nama: contracts_updated_at, **trg_enforce_contract_renter_eligibility**, trg_prevent_contract_overlap, trg_validate_contract_override. Trigger baru hanya membaca `override_type` dan `override_reason` yang dikirim di baris NEW, jadi nilainya **sudah tersedia**. Tidak ada pertentangan: aturan 10 karakter lebih ketat dari "tidak kosong", sehingga validasi lama tetap lolos untuk Owner yang sah.
2. **TEMUAN: `override_by` bisa dipalsukan.** Karena memakai `COALESCE`, pemanggil API bisa mengirim `override_by` berisi ID orang lain, dan nilai itu akan dipertahankan. Akibatnya audit penimpaan tidak bisa dipercaya. **Koreksi:** pada INSERT, atau saat penyewa diganti dengan `override_type` terisi, trigger baru memaksa `override_by := auth.uid()` dan `override_at := now()`. `COALESCE` di `validate_contract_override` kemudian memakai nilai ini. Fungsi lama tidak diubah.
3. **Jalur API langsung.** Status verifikasi, status aktif, peran Owner (dari `auth.uid()` di server), `override_type = 'pembuatan_kontrak'`, dan alasan minimal 10 karakter semuanya diperiksa di dalam trigger. Policy RLS tidak dapat melewatinya. Pemanggil tanpa sesi ditolak.
4. **Interaksi dengan trigger lain.**
   - Jika kontrak ditolak, seluruh pernyataan dibatalkan. Pemeriksaan tumpang tindih, deposit otomatis, sinkron kendaraan, riwayat status, dan audit tidak berjalan atau ikut dibatalkan.
   - Untuk kontrak yang sah, trigger hanya mungkin mengisi `override_by`/`override_at`, jadi alur lain tidak berubah.
   - Perubahan status (aktif, selesai, batal) tidak menyentuh `renter_id`, jadi tidak terpengaruh.
5. **Edit draft.** `perbaruiKontrakDraft` selalu mengirim `renter_id`, jadi trigger ikut berjalan. Fungsi langsung keluar jika `renter_id` tidak berubah, sehingga edit biasa tetap berhasil.
6. **Rollback** hanya menghapus trigger dan fungsi baru. Kolom `override_by` yang sudah diisi tetap ada, dan itu benar.

## SQL final (terkoreksi)
```sql
CREATE OR REPLACE FUNCTION public.enforce_contract_renter_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status public.verification_status;
  v_active boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.renter_id IS NOT DISTINCT FROM OLD.renter_id THEN
    RETURN NEW;
  END IF;

  IF NEW.override_type IS NOT NULL THEN
    NEW.override_by := auth.uid();
    NEW.override_at := now();
  END IF;

  SELECT verification_status, is_active INTO v_status, v_active
  FROM public.renters WHERE id = NEW.renter_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Penyewa tidak ditemukan.' USING ERRCODE = '23503';
  END IF;

  IF v_status = 'terverifikasi' AND v_active THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'owner')
     AND NEW.override_type = 'pembuatan_kontrak'
     AND length(btrim(coalesce(NEW.override_reason, ''))) >= 10 THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Penyewa belum terverifikasi atau nonaktif. Hanya Pemilik yang dapat menimpa aturan ini dengan alasan minimal 10 karakter.'
    USING ERRCODE = '42501';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_contract_renter_eligibility() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_enforce_contract_renter_eligibility
BEFORE INSERT OR UPDATE OF renter_id ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.enforce_contract_renter_eligibility();
```

## Rollback
```sql
DROP TRIGGER IF EXISTS trg_enforce_contract_renter_eligibility ON public.contracts;
DROP FUNCTION IF EXISTS public.enforce_contract_renter_eligibility();
```

## Perubahan UI (FormKontrak.tsx)
- Validasi langkah 0 menolak saat `kelayakan.isPending` ("Memeriksa kelayakan penyewa…") atau `kelayakan.isError` ("Pemeriksaan kelayakan gagal. Coba lagi.").
- Validasi alasan di UI disamakan menjadi minimal 10 karakter, supaya pesannya jelas sebelum ditolak server.

## Tes penerimaan
| # | Skenario | Harapan |
|---|---|---|
| 1 | Admin, penyewa belum terverifikasi (UI dan API) | Ditolak (42501) |
| 2 | Admin mengirim `override_type='pembuatan_kontrak'` dan `override_by` = Owner lewat API | Ditolak |
| 3 | Owner, penyewa belum terverifikasi, alasan ≥ 10 karakter | Kontrak terbentuk, `override_by` = Owner (bukan nilai kiriman), ada audit, deposit terbentuk |
| 4 | Owner, alasan < 10 karakter atau kosong | Ditolak |
| 5 | Admin, penyewa terverifikasi dan aktif | Kontrak terbentuk, deposit dan status kendaraan seperti biasa |
| 6 | Penyewa terverifikasi tetapi nonaktif | Ditolak, kecuali tes 3 |
| 7 | Edit draft tanpa mengganti penyewa | Berhasil |
| 8 | Edit draft, mengganti ke penyewa belum terverifikasi (Admin) | Ditolak |
| 9 | UI: cek kelayakan masih dimuat atau gagal | Tombol Lanjut ditolak dengan pesan |
| 10 | Katalog | Trigger aktif, fungsi tidak dapat dijalankan oleh anon/authenticated, pemilik postgres |

## Keputusan
**GO**, dengan koreksi poin 2 (pemaksaan `override_by` dan `override_at`) sudah dimasukkan ke SQL final. Tes runtime belum dijalankan.
