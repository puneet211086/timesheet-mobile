# Timesheet Mobile — Milestone 5

Adds editing and deletion for completed time entries.

## Included

- Tap completed shifts from Timesheet or Calendar
- Change job, work date, clock-in time, clock-out time, and notes
- Live duration and estimated-pay preview
- Validation for malformed dates/times and invalid ranges
- Delete confirmation
- Automatic refresh after returning to Timesheet or Calendar
- No database migration or additional package required

## Apply

Copy this folder's contents into the existing project and replace matching files, then run:

```bash
npx expo start --clear
```

Date fields use `YYYY-MM-DD`; time fields use 24-hour `HH:MM` format.
