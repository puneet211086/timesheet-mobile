# Timesheet Mobile — Milestone 11 (iOS Polish)

Adds native date/time controls for manual entry and entry editing.

## Included

- Native iOS wheel date and time pickers
- Native Android date/time dialogs
- Web text-field fallback
- Device-localized time display (12/24-hour)
- Success haptic after saving on mobile
- Existing break, overlap, validation, and delete behavior retained
- No database migration

## Install

Copy the included `app` and `components` folders into the project root and replace matching files.

Install the Expo-compatible dependencies:

```bash
npx expo install @react-native-community/datetimepicker expo-haptics
npx expo start --clear
```

## Test

1. Open Timesheet > Add.
2. Tap Date, Clock in, and Clock out on an iPhone.
3. Confirm the wheel picker opens and Done closes it.
4. Save and confirm the success haptic.
5. Open a completed shift and verify the same controls on Edit Shift.
6. Confirm web still shows typed date/time fields.
