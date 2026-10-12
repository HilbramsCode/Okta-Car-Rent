# Pilot: Sign-Up Trigger Check Before Restoring It (read-only)

Nothing was changed: no triggers, functions, schema, records, permissions, settings, accounts or code.

## 1. Original trigger definition
Source: the original project's saved code (migration 2026-07-27), read from a read-only snapshot. I could not read the original's live database, so whether it is actually there today is UNKNOWN.
```text
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 2. Pilot status and comparison
| Item | Original (saved code) | Pilot (live) | Result |
|---|---|---|---|
| Trigger on the auth user table | on_auth_user_created, runs after a new user is created, once per user | none (0 found) | MISSING (VERIFIED) |
| Function code | handle_new_user | handle_new_user | IDENTICAL (VERIFIED, line-by-line compare, whitespace ignored) |
| Security context | SECURITY DEFINER, search_path=public | same, owner postgres | MATCH |
| Who can run the function directly | removed from public, anon and authenticated | **still runnable by anon and authenticated** | DIFFERENT |

The permission difference is low risk: the function only runs as a trigger and fails if called directly. Still, it differs from the original and is worth fixing in the same migration.

## 3. Dependencies and risks
- Everything the function needs is present (VERIFIED): the profiles, user_roles, renters and notification_preferences tables, plus the unique keys its "skip if already there" logic relies on.
- So restoring the trigger alone is enough for sign-ups to create a profile, a role (owner for the first account, then renter), a renter record and notification preferences.
- **Concurrency risk (confirmed by reading the code):** the owner check is simply "no roles exist yet", with no lock. Two sign-ups landing at the same moment could both become Owner. Mitigation without code changes: register the Owner alone before sharing the link, then confirm there is exactly one owner.
- **New risk found:** renters have a unique phone rule. If a new renter signs up with a phone number already used by another renter, the trigger fails and **the whole sign-up fails**, with only a generic error shown. Not a blocker for the Owner, but worth handling later.
- Email confirmation and other sign-in settings remain UNKNOWN (not readable here).

## 4. Proposed minimal migration (pilot only)
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
```
The DROP IF EXISTS only makes the step safe to repeat; nothing currently exists to drop. The function code is unchanged. Nothing is changed in the original project.

## 5. Verification after implementation
1. Read-only: exactly one trigger on the auth user table, named on_auth_user_created, AFTER INSERT, calling handle_new_user, enabled.
2. Read-only: the function's run permission is limited to postgres and service_role.
3. Read-only: the original project's saved code still points to its own backend.
4. After you separately approve creating the Owner: register it alone, then confirm 1 profile, exactly 1 `owner` role, 0 renter records and 1 notification-preferences row.
5. Later, a test renter sign-up confirms the `renter` role and a renter record. That test account is kept or removed only with your approval.
