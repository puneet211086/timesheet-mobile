# Timesheet Mobile — Milestone 16

Adds complete local backup and restore for the local-first app.

## Included
- Export jobs, shifts, breaks, templates, and most settings as JSON
- Native iOS/Android share sheet
- Browser download support
- Restore from a selected backup file
- Transactional replacement of local data
- Backup-format validation
- Restore confirmation and privacy warning
- Face ID setting and notification IDs intentionally excluded
- Shift Templates link restored in Settings
- No database migration

## Install
Copy the included folders into the project root and replace matching files:

- `app/`
- `services/`

Install the Expo-compatible document picker:

```bash
npx expo install expo-document-picker
npx expo start --clear
```

The project already uses `expo-file-system` and `expo-sharing` from the export milestone.

## Test
1. Create sample jobs, shifts, and a template.
2. Open Settings > Backup & Restore.
3. Export a backup and save it to Files.
4. Add or change a record.
5. Restore the saved JSON backup.
6. Confirm the original jobs, shifts, reports, and templates return.

Always export a fresh backup before testing restore with important data.
