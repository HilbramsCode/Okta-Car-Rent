# First Owner Account — Read-only Verification

Nothing was changed. No email addresses or personal details are included.

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Exactly one Owner role for the new account | PASS | 1 account total (confirmed email); 1 role row total, and it is `owner`; that account holds exactly one role |
| 2 | Exactly one matching profile | PASS | 1 profile total, linked to the account |
| 3 | No renter record | PASS | 0 renter records total; 0 linked to the account |
| 4 | Notification preferences created | PASS | 1 preferences row, linked to the account (the sign-up function creates it) |
| 5 | No duplicate profiles or roles | PASS | Totals are 1 profile and 1 role for 1 account |
| 6 | Can open Owner dashboard and Owner-only pages | UNKNOWN (live) / PASS (rules) | The Owner pages only allow the `owner` role, and this account has it. A live check needs a sign-in session for the account; that was not done, to avoid any sign-in activity on the account |
| 7 | Original demo/QA project untouched | PASS (as far as can be checked) | Nothing in this task reached outside the pilot backend. The original's live database cannot be read from here, so its current state is UNKNOWN |

## Optional next step (needs your approval)

- Live check of check 6: sign in as the Owner in a test browser, open the Owner dashboard and an Owner-only page (for example Analytics), and take screenshots. This adds one sign-in session but changes no data.
- After that: create Admin and Renter accounts, but only when you say so.
