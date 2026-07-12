# Timesheet Mobile — Milestone 21

Adds Dashboard 2.0 and user-experience polish to the Home tab.

## Included

- Refined active-shift hero card
- Clear shift status and live timer
- Improved job picker
- Today's hours and earnings cards
- Weekly progress and overtime state
- Quick actions for Add Shift, Reports, Calendar, and Jobs
- Tappable completed recent entries
- Improved loading and empty states
- Accessibility labels and larger touch targets
- Automatic refresh whenever Home regains focus
- No database migration
- No new packages

## Install

Copy these folders into the project root and replace matching files:

- `app/`
- `components/`
- `types/`

Then restart:

```bash
npx expo start --clear
```

## Test

1. Open Home with no entries and verify the improved empty state.
2. Select a job and clock in.
3. Confirm the status, timer, and clock-out button update.
4. Verify Today hours and earnings update while the shift runs.
5. Clock out and tap the completed recent entry.
6. Test Add Shift, Reports, Calendar, Jobs, Settings, and View All shortcuts.
7. Add a shift from another screen and return Home; totals should refresh.
8. Test on a narrow iPhone screen and with larger accessibility text.

## Notes

This milestone intentionally reuses the existing weekly calculation and 40-hour target. Advanced daily/weekly/double-time rules remain a future payroll milestone.
