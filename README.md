# Timesheet Mobile — Milestone 17

Adds persistent display and formatting preferences.

## Included
- Currency: USD, CAD, GBP, EUR, INR, AUD
- Week starts on Monday or Sunday
- System, 12-hour, or 24-hour time format
- System, light, or dark appearance
- Live preferences preview
- Central `PreferencesProvider`
- App navigation and status bar respond immediately to appearance
- Safe default settings migration
- No new npm packages

## Install
Copy the included folders into the project root and replace matching files:

- `app/`
- `components/`
- `constants/`
- `database/`

Then restart:

```bash
npx expo start --clear
```

## Test
1. Open Settings > Display & Formatting.
2. Change currency and verify the preview.
3. Change 12/24-hour format and verify the preview.
4. Change the week-start day.
5. Switch Light/Dark/System and verify the page, navigation header, and status bar change immediately.

## Integration note
Use `usePreferences()`, `formatCurrency()`, and `formatTime()` from `components/PreferencesProvider` when formatting values in Dashboard, Calendar, Reports, and exports. The central preference storage is now ready for those screens.
