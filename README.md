# Timesheet Mobile — Milestone 7

Adds PDF and CSV export to the Reports screen.

## Files included

- `app/(tabs)/reports.tsx`
- `services/exportService.ts`

## Install

Copy the included `app` and `services` folders into the root of your current project and replace matching files.

Install the Expo-compatible filesystem package:

```bash
npx expo install expo-file-system
```

Restart Expo:

```bash
npx expo start --clear
```

## Behavior

- **Web PDF:** opens the browser print dialog, where the user can save as PDF.
- **iOS/Android PDF:** generates a PDF and opens the native share sheet.
- **Web CSV:** downloads the CSV directly.
- **iOS/Android CSV:** creates the CSV in cache and opens the native share sheet.
- Exports use the currently selected weekly or monthly reporting period.
