# Timesheet Mobile — Milestone 9

Adds local forgotten-clock-out reminders.

## Files included

- `app/(tabs)/settings.tsx`
- `database/db.ts`
- `hooks/useTimesheet.ts`
- `services/notificationService.ts`
- `types/models.ts`

## Install

Copy the included folders into the root of the existing Milestone 8 project and replace matching files.

`expo-notifications` is already listed in the project dependencies. To confirm the SDK-compatible version, run:

```bash
npx expo install expo-notifications
```

Restart Expo:

```bash
npx expo start --clear
```

## Test on iOS or Android

1. Open Settings.
2. Enable the forgotten clock-out reminder and allow notification permission.
3. Pick the reminder threshold.
4. Press **Send test notification**.
5. Clock in. A local notification is scheduled.
6. Clock out. The scheduled notification is canceled.

Local reminders are not enabled on the web build. Expo Go supports local notifications on iOS and Android. Remote push notifications are not part of this milestone.
