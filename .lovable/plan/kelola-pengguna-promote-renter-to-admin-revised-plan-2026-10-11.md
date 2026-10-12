# Kelola Pengguna (Promote Renter to Admin): Revised Plan

Nothing has been built or changed yet. This plan waits for your approval.

## Scope

There is one Owner-only page with one action: **"Jadikan Admin"** (make Admin), used on an eligible Renter. The plan does not add general role editing, account deletion, invitations or anything else.

## What I checked (read-only)

- **Roles table:** each person can hold a given role only once (a unique rule on person + role). The current access rule lets an Owner add, change and remove roles. Every role change already writes an entry to the audit log (`audit_user_roles` → `record_audit_log`).
- **Table-level permissions on the roles table:** UNKNOWN. They can't be read with my read-only access. The design below doesn't depend on them.
- **Records that point to a renter:** `contracts`, `deposits`, `outstanding_payments` and `renter_notes`.
- **Records that point to a contract:** `payments`, `outstanding_payments`, `deposits`, `contract_extensions`, `contract_checklists`, `contract_status_history` and `maintenance_records`. Every one of these needs a contract first, so "no contracts" also rules out all of them.
- **Renter records** already have an `is_active` switch. The app's own "Nonaktifkan" (deactivate) and "Aktifkan" (activate) buttons use it. The renters list hides inactive renters by default, and inactive renters can't be put on a new contract. This is the reversible approach.
- **Server security:** the app already sends each signed-in user's identity to server actions, and server actions are protected against cross-site requests.

## Design

### 1. Database function `promote_renter_to_admin(_target uuid)` (new; one migration)
- Runs with elevated rights, but only after its own checks. Every step happens in a single all-or-nothing transaction: if any check or step fails, nothing changes.
- **Caller check:** the person calling must hold exactly one role, and it must be `owner`. Otherwise the action is refused.
- **Target checks:** the target is not the caller. The target has exactly one role, and it is `renter` (so an Owner or an existing Admin is refused). Owner can never be granted, because the function's only grant is `admin`.
- **Has-records check:** the target's renter record has no contracts, deposits, outstanding payments or renter notes. Any match refuses the action and lists the reason.
- **Clash lock:** the target's role rows are locked while the change runs, so two clicks at once can't both go through.
- **Steps:** remove the `renter` role, add the `admin` role, then set `is_active = false` on the renter record with a note explaining why. No rows are deleted, and no historical or financial data is touched.
- **Audit:** the existing trigger logs the role removal and the role addition. The function also writes one summary entry ("promoted renter to admin").
- **Permissions:** only signed-in users can run it. The checks inside the function decide who actually succeeds. Anonymous visitors can't run it at all.

### 2. Tighten the roles access rule (same migration)
- Replace the broad "Owner can do anything to roles" rule with read-only access (people see their own role; staff see all roles). After this, every role change must go through the function, so nobody can bypass the checks by writing to the table directly.
- The sign-up trigger still works, because it runs with elevated rights and isn't limited by this rule.

### 3. Server action `promoteToAdmin` (new)
- Requires sign-in. It calls the function **as the signed-in user**, so no privileged key is ever used or sent to the browser.
- It checks the input (a valid account ID) and turns refusals into clear Indonesian messages.

### 4. Owner page `/dashboard/owner/pengguna` (new)
- The existing Owner-only gate protects the page. That gate is only a convenience; the real protection is the function's checks.
- It lists accounts with their role. Renter rows that are eligible show a "Jadikan Admin" button with a confirmation step; the others show why they aren't eligible.
- A "Kelola Pengguna" link is added to the Owner dashboard.

## Risks, migration and rollback

- **Tightening the access rule:** the app writes roles nowhere else today (checked), so nothing else breaks. Rollback is a migration that restores the old rule.
- **Undoing a promotion:** there's no undo button (out of scope). A promotion can be reversed by hand: remove `admin`, add `renter`, reactivate the renter record.
- **Rolling back the whole feature:** drop the function and restore the access rule. No data is lost.
- **Leftover records:** the old renter record stays as an inactive record. It's hidden from the default list and still appears when "show inactive" is on.
- **Wide Admin access:** an Admin counts as staff, so they get broad access to data. That's existing behaviour and isn't changed here.

## Acceptance tests

These are kept in the project and run against the function with test accounts. The test accounts are only created when tests run, after you approve.

1. **Owner authorization:** the Owner promotes an eligible Renter. Afterwards the target has exactly one role, `admin`, and its renter record is inactive.
2. **Admin denial:** an Admin calling the function is refused, and roles don't change.
3. **Renter denial:** a Renter calling the function is refused.
4. **Self-promotion:** the Owner targeting their own account is refused.
5. **Owner-role protection:** targeting the Owner is refused. No path can grant `owner`.
6. **Duplicate role:** targeting an existing Admin is refused, and the account still has exactly one `admin` role.
7. **Audit:** a successful promotion creates the role-removal, role-addition and summary entries. A refused attempt creates none and changes nothing.
8. **Target with records:** a Renter with a contract, deposit, outstanding payment or note is refused, and nothing changes.
9. **Direct-write block:** the Owner trying to write to the roles table directly (outside the function) is refused.

## Confirmation

No accounts, roles, records, settings, code or database objects have been changed.

---

## Final security review (read-only)

Nothing was changed while reviewing. I made no test accounts and ran no functions.

| # | Area | Result | Evidence and required plan change |
|---|---|---|---|
| 1 | Checking the caller is the Owner | PASS (with changes) | The function will run as `postgres`, the same owner as the existing `handle_new_user`. Required: refuse the action when the caller's sign-in identity (`auth.uid()`) is empty; require the caller to hold exactly one role, and it must be `owner` (a count check, not `has_role`, which would also pass someone holding several roles); fix the function's search path (`search_path = public`) |
| 2 | Only signed-in users can run it; direct writes are blocked | PASS (with changes) | New database functions can be run by everyone by default. Required: revoke run permission from everyone (`PUBLIC`) and from anonymous visitors (`anon`), then grant it only to signed-in users (`authenticated`). Direct writes: the only rule that allows writing to roles today is `user_roles_owner_manage`, and replacing it with read-only access closes that path. Row security is on for the roles table. Ordinary users can't bypass it (`authenticated`/`anon` have no bypass right), and `postgres` can, which is what the function relies on. Table-level permissions are still UNKNOWN, but they don't matter once the write rule is gone |
| 3 | Locking against clashes | PASS (with changes) | The roles table only prevents the same person holding the same role twice (`UNIQUE (user_id, role)`), so on its own it can't stop two promotions at once. Required: take a lock tied to the target account for the length of the change (`pg_advisory_xact_lock`), then lock the target's role rows and renter row (`SELECT … FOR UPDATE`) before checking. Re-check eligibility after taking the locks |
| 4 | Sign-up, role reads and sign-in keep working | PASS | `handle_new_user` is the only database code that writes roles, and it runs as `postgres`, which bypasses row security, so tightening the rule can't block sign-up. The read rule (`user_roles_select`: own role, or staff) stays exactly as it is, so the app's role look-up and page gates are unaffected. Nothing in the app writes roles (checked earlier) |
| 5 | All-or-nothing changes with audit | PASS | One function call runs as one transaction. The audit trigger on roles (`record_audit_log`, run as `postgres`) records the caller via `auth.uid()` as the actor. Renters also have their own audit trigger plus `trg_protect_renter_admin_fields`, which always lets staff (the Owner) through. If any step fails, all of it is undone, including the audit entries. Required: show a clear refusal if the target has the Renter role but no renter record (unexpected, but possible) |
| 6 | Data is kept; no path can create an Owner | PASS | The function grants only the fixed value `admin`; Owner isn't an input. No data is deleted: the renter record is only switched to inactive. Rollback (drop the function, put back the old rule) loses no data, **but putting back the old rule reopens direct role writes for the Owner**. Recommended rollback: drop the function and keep roles read-only |

### Remaining risks
- Table-level permissions on the roles table can't be read with my access (UNKNOWN). This is harmless once the write rule is removed.
- The Owner can already deactivate a renter record through the existing renters screen. A promoted Admin's old renter record could be reactivated that way, which would put it back on the active renters list. Their role would stay Admin. This is low risk and only affects how the list looks.
- An Admin who still has the app open keeps their old Renter view until they reload. Page access is re-checked from the database on every visit.

### Confirmation
No accounts, roles, records, settings, code or database objects were changed.
