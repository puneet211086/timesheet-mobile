# Timesheet Mobile — Milestone 14

Adds saved shift templates and one-tap quick entry.

## Included
- Create reusable shift templates
- Save a default job, clock-in/out times, unpaid break, and notes
- Apply a template instantly from Add Shift
- Manage and delete templates from Settings
- Safe SQLite migration
- Existing entries and calculations remain unchanged
- No new npm packages

## Install
Copy the included `app` and `database` folders into the project root and replace matching files.

Restart Expo:

```bash
npx expo start --clear
```

## Test
1. Open Settings > Shift Templates.
2. Save a template such as “Weekday 9–5”.
3. Open Timesheet > Add.
4. Tap the template under Quick Templates.
5. Confirm job, times, break, and notes are prefilled.
6. Save the entry and verify it appears across the app.
