# Rencana Migrasi: Perbaiki record_audit_log untuk ID non-UUID

Tahap ini hanya membaca. Belum ada migrasi atau rollback yang dijalankan.

## Kondisi saat ini (dibaca dari database pilot)
- Fungsi `public.record_audit_log()`:
  - Pemilik: `postgres`.
  - `SECURITY DEFINER`, `search_path=public`.
  - md5 isi fungsi: `3f6cdc1387cc1dd0a8117af39d8a022f`.
  - Hak akses: `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}`.
- Dipakai oleh 16 trigger:
  - **15 tabel dengan `id` bertipe uuid:** user_roles, renters, contracts, vehicles, renter_notes, contract_extensions, payments, deposits, maintenance_records, deposit_deductions, maintenance_items, workshops, outstanding_payments, payment_allocations, maintenance_invoices.
  - **1 tabel dengan `id` bertipe boolean:** `maintenance_settings`, hanya untuk UPDATE.

## SQL migrasi (`fix_audit_log_non_uuid_id`)
Isinya identik dengan definisi asli. Hanya tiga baris assignment `v_entity_id` yang diganti, ditambah satu variabel `v_id_text`. Tidak ada BEGIN/COMMIT, karena migrator sudah menjalankannya dalam satu transaksi. `CREATE OR REPLACE` mempertahankan pemilik dan seluruh hak akses.

```sql
CREATE OR REPLACE FUNCTION public.record_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_entity_id UUID;
  v_changes JSONB;
  v_old JSONB;
  v_new JSONB;
  v_key TEXT;
  v_id_text TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id_text := to_jsonb(OLD) ->> 'id';
  ELSE
    v_id_text := to_jsonb(NEW) ->> 'id';
  END IF;
  IF v_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_entity_id := v_id_text::uuid;
  ELSE
    v_entity_id := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_changes := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new -> v_key IS DISTINCT FROM v_old -> v_key AND v_key <> 'updated_at' THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('before', v_old -> v_key, 'after', v_new -> v_key)
        );
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    v_action := 'delete';
    v_changes := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, changed_fields)
  VALUES (
    auth.uid(),
    public.current_role_name(),
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    TG_TABLE_NAME || ' ' || v_action,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
```

## SQL rollback (definisi asli persis, dibaca dari pg_get_functiondef)
```sql
CREATE OR REPLACE FUNCTION public.record_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_entity_id UUID;
  v_changes JSONB;
  v_old JSONB;
  v_new JSONB;
  v_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_entity_id := NEW.id;
    v_changes := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_entity_id := NEW.id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_changes := '{}'::jsonb;
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_new -> v_key IS DISTINCT FROM v_old -> v_key AND v_key <> 'updated_at' THEN
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('before', v_old -> v_key, 'after', v_new -> v_key)
        );
      END IF;
    END LOOP;
    IF v_changes = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    v_action := 'delete';
    v_entity_id := OLD.id;
    v_changes := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, summary, changed_fields)
  VALUES (
    auth.uid(),
    public.current_role_name(),
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    TG_TABLE_NAME || ' ' || v_action,
    v_changes
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
```
Setelah rollback, md5 isi fungsi harus kembali ke `3f6cdc13…022f`.

## Analisis risiko
- **15 tabel ber-ID uuid:** UUID diubah ke teks lalu kembali ke uuid, jadi nilainya identik. Format teks UUID dari Postgres selalu lolos pola regex. Aksi, data perubahan, pelaku, peran, dan ringkasan tidak berubah. Risiko: **rendah**.
- **maintenance_settings:** sebelumnya error, sekarang tercatat dengan `entity_id = NULL`. Kolom ini memang boleh NULL. `entity_type` tetap `maintenance_settings`.
- Perhitungan `to_jsonb` dilakukan sekali lagi per baris. Dampak kinerjanya bisa diabaikan.
- Trigger, aturan akses, izin, peran, dan aturan bisnis tidak diubah. Pemilik dan `SECURITY DEFINER`/`search_path` dipertahankan oleh `CREATE OR REPLACE` dengan header yang sama.
- Jika migrasi gagal, migrator membatalkannya secara atomik dan fungsi lama tetap berlaku.

## Tes pascamigrasi
1. **Katalog:** pemilik postgres, prosecdef true, search_path=public, hak akses sama dengan daftar di atas, md5 berubah, 16 trigger masih ada.
2. **Simpan pengaturan (Owner, lewat UI):** ubah oli dari 5000 ke 5100 lalu simpan. Harapannya berhasil dan nilainya tetap setelah halaman dibuka ulang. Simpan tanpa perubahan juga tidak boleh error.
3. **Audit pengaturan:** ada 1 entri baru `maintenance_settings update` dengan `entity_id` NULL, pelaku Owner, dan `changed_fields` berisi oil_interval_km 5000 → 5100. Simpan tanpa perubahan tidak menambah entri.
4. **Audit kendaraan:** Admin mengubah satu kolom kendaraan uji. Harapannya ada entri `vehicles update` dengan `entity_id` sama dengan UUID kendaraan dan pelaku Admin.
5. Opsional: kembalikan oli ke 5000 lewat UI.

## Keputusan
**GO** untuk diajukan ke persetujuan penerapan. Definisi asli sudah dibaca langsung dari database, dan rollback adalah salinan persisnya. Tidak ada penghambat yang terbuka. Tes runtime belum dijalankan karena migrasi belum diterapkan.

## Review tambahan (read-only)
| Pemeriksaan | Hasil | Bukti |
|---|---|---|
| Pemilik tetap | PASS | `CREATE OR REPLACE` tidak mengganti pemilik fungsi yang sudah ada. Pemilik sekarang `postgres`, dan migrator juga berjalan sebagai `postgres`. |
| SECURITY DEFINER dan search_path | PASS | Keduanya ditulis eksplisit di header SQL baru. Postgres mengganti atribut sesuai header, dan nilainya sama dengan yang sekarang. |
| Atribut lain | PASS | Sekarang: VOLATILE, PARALLEL UNSAFE, tidak LEAKPROOF, tidak STRICT, COST 100, plpgsql. Semuanya adalah nilai default, dan header baru (tanpa klausa tambahan) menghasilkan nilai default yang sama. |
| ACL sebelum dan sesudah | PASS (desain) | `CREATE OR REPLACE` tidak menyentuh `proacl`. Saat ini `proacl` tidak NULL. Sebelum = sesudah = `{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}`, yaitu PUBLIC, postgres, anon, authenticated, dan service_role semuanya EXECUTE dengan grantor postgres. Bukti runtime menyusul lewat tes katalog. |
| Pola regex menerima UUID | PASS | 62 ID nyata dari vehicles, user_roles, renters, contracts dan audit_logs, ditambah 1 `gen_random_uuid()`, ditambah UUID nol: **0 yang gagal**. Postgres selalu menulis UUID dalam huruf kecil, 8-4-4-4-12. Ke-15 tabel memakai tipe `uuid` yang sama. |
| Boolean ditolak dengan aman | PASS | Untuk `maintenance_settings`, `to_jsonb(NEW)->>'id'` menghasilkan `'true'`. Nilai ini tidak cocok dengan pola, jadi `entity_id = NULL` tanpa error. |
| Rollback identik | PASS | Isi rollback adalah salinan persis `pg_get_functiondef` yang dibaca sebelumnya, dengan header (atribut, search_path) yang sama. Verifikasi setelah rollback: md5 `prosrc` = `3f6cdc1387cc1dd0a8117af39d8a022f`, dan ACL tidak berubah. |

**Ketidaksesuaian: tidak ada.** Rencana tidak perlu dikoreksi. Keputusan tetap **GO**, menunggu persetujuan penerapan. Tes runtime belum dijalankan.
