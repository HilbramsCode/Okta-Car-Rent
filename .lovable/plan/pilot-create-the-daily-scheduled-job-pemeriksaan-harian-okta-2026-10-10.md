# Pilot: Create the Daily Scheduled Job (pemeriksaan-harian-okta)

## Verified findings (read-only, already done)
- Pilot backend: rjqlmsndbbqbltqandcx. Original (Okta Sewa Mobil): ovtnocphzlcyulaspypo. They are different backends: SEPARATE.
- pg_cron is installed in the pilot. The scheduled job list is empty.
- The function jalankan_pemeriksaan_harian_sistem exists in the pilot.

## Change (pilot backend only)
Create one scheduled job. Before creating it, check that no job with this name exists, so no duplicate can be made:

```text
cron.schedule('pemeriksaan-harian-okta', '0 22 * * *',
  'select public.jalankan_pemeriksaan_harian_sistem()')
```
- Runs daily at 22:00 UTC (05:00 WIB). The job calls the function inside the database: no public link, no secret.
- The function will not be run by hand. Nothing else changes: function code, schema, security rules, permissions, triggers, storage, sign-in and app code all stay as they are.
- This is done with a single data change to the scheduler, not a schema migration.

## Verification afterwards (read-only)
1. Exactly one job named pemeriksaan-harian-okta exists.
2. Its schedule is `0 22 * * *` and it is enabled.
3. Its command calls public.jalankan_pemeriksaan_harian_sistem().
4. The original project: its saved code snapshot still points to its own backend. Its live scheduler can't be read from here, so that part is reported as UNKNOWN.

## Out of scope
Email sign-in, creating accounts, publishing.
