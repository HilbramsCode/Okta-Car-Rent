# Pilot Auth — Minimal Configuration Plan

Nothing is changed by this plan. Each step waits for your approval.

## Confirmed facts (read-only)

- Pilot backend: ref `rjqlmsndbbqbltqandcx`, live, zero user accounts — the first registration becomes Owner via the restored sign-up trigger.
- Pilot site origin (preview): `https://id-preview--a5c346d1-fab7-458e-80f3-87bdc5d59d19.lovable.app`. No published URL and no custom domain yet.
- Current sign-in settings are not readable with the available read-only tools, so the plan sets each approved value explicitly rather than assuming a starting state.

## Supported configuration controls

The platform supports exactly these controls relevant to your approved targets:

1. **Email/password sign-in on/off** — a dedicated enable switch (idempotent; safe to apply even if already on).
2. **Email confirmation required** — controlled by an "auto-confirm email" switch. Requiring confirmation = auto-confirm OFF.
3. **Leaked-password protection** — a supported switch (checks passwords against known breach lists at sign-up and password change).
4. **Sign-up restrictions** — a "disable sign-up" switch exists; leave it OFF so the Owner can register.
5. **Anonymous users** — a switch exists; keep OFF (not used by this app).

**Limitation: redirect URLs.** There is no tool in this project to view or edit the hosted redirect-URL allow-list. The app already sends confirmation links back to `/auth` and recovery links to `/reset-password` on the current origin. Lovable Cloud projects normally accept their own `*.lovable.app` origin; whether the preview origin above is allow-listed cannot be verified except by an actual sign-up/recovery email. This is flagged, not guessed.

## Proposed changes (minimal, in order)

| # | Setting | Target value | Why |
|---|---------|--------------|-----|
| 1 | Email/password sign-in | Enabled | Required for the app's sign-in page |
| 2 | Auto-confirm email | OFF (= confirmation required) | Proves the Owner's email is real |
| 3 | Leaked-password protection | ON | Approved target; supported |
| 4 | Disable sign-up | OFF | Owner must be able to register |
| 5 | Anonymous users | OFF | Not used |

No code, database, trigger, job, or original-project changes. No publishing.

## How each setting is verified afterward

1. **Sign-in enabled:** attempt registration of the first Owner account through the app's sign-up page — it should succeed rather than error with "sign-ups disabled".
2. **Confirmation required:** after registering, signing in before clicking the confirmation email should fail; after clicking it, sign-in succeeds. (Verified as part of the Owner registration step, with your approval.)
3. **Leaked-password protection:** attempt a sign-up with a known-breached password (e.g. a common dictionary password) in a throwaway test — it should be rejected. Optional; can be skipped to avoid extra accounts.
4. **Redirect URLs:** the confirmation email's link must open the pilot site and land on a working page; the recovery flow (forgot password → email → `/reset-password`) must complete. Both are verified live during Owner registration since no read-only check exists.

## Open decision for you

- Redirect-URL allow-list cannot be inspected or set from here. If confirmation or recovery links fail during verification, the fix is to add the preview origin (and later the published/custom domain) to the allow-list in the Cloud auth settings — I will flag it at that point rather than guess now.
