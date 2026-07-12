# Timesheet Mobile — Milestone 19

Adds safer backup inspection and restore controls.

## Included

- Backup preview before restore
- Current-device record counts
- Export date, shift range, and record counts
- Stronger backup format validation
- Duplicate ID and duplicate setting detection
- Orphan job-reference detection
- Invalid date, pay-rate, and break validation
- Warnings for active shifts and empty backups
- Transactional restore retained
- Face ID and notification identifiers remain excluded
- No database migration
- No new packages

## Install

Copy these folders into the project root and replace matching files:

- `app/`
- `services/`

Then restart:

```bash
npx expo start --clear
```

## Test

1. Open Settings > Backup & Restore.
2. Export a current backup.
3. Choose the exported file.
4. Verify the preview shows counts, export date, and shift range.
5. Confirm no data changes until `Replace data with this backup` is pressed.
6. Test an invalid JSON file and confirm it is rejected.
7. Restore the valid backup and verify Dashboard, Calendar, Reports, and Templates.
