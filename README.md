# Timesheet Mobile — Milestone 8: Unpaid Break Tracking

## Included
- Safe SQLite migration adding `unpaid_break_minutes` to existing time entries
- Preserves all existing jobs and shifts
- Add common break lengths: 15, 30, 45, or 60 minutes
- Enter a custom unpaid-break duration
- Live paid-hours and earnings preview while editing
- Break-aware Home dashboard, weekly totals, Timesheet, Reports, PDF, and CSV calculations
- Break details displayed on recent and Timesheet entries
- No new npm dependencies

## Apply
Copy this package into the existing project and replace matching files.

Then restart Expo so the SQLite migration runs:

```bash
npx expo start --clear
```

## Test
1. Open a completed entry from Timesheet or Calendar.
2. Select a 30-minute unpaid break and save.
3. Confirm the shift's paid duration and earnings decrease.
4. Confirm Home and Reports totals also decrease.
5. Export PDF and CSV and verify they use the reduced paid hours.
6. Reopen the entry, change the break to None, and save.
