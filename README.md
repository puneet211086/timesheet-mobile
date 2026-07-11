# Timesheet Mobile — Milestone 6

Adds a complete weekly/monthly Reports dashboard.

## Files included

- `app/(tabs)/reports.tsx`
- `app/(tabs)/_layout.tsx`
- `hooks/useReports.ts`
- `services/reportService.ts`

## Install

Copy these folders into the root of your existing project and replace matching files.

Then run:

```bash
npx expo start --clear
```

## Notes

- No database migration is required.
- No new dependency is required.
- Weekly overtime begins after 40 hours for the selected week.
- Monthly reports show overtime as zero because overtime must be evaluated week-by-week; weekly aggregation across month boundaries is planned for the export/payroll milestone.
