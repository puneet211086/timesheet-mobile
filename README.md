# Timesheet Mobile — Milestone 2

This overlay adds multi-job time tracking to the Expo starter.

## Included

- Persistent SQLite database
- Safe migration from milestone 1
- Create and edit jobs
- Hourly and overtime rates
- Job colors
- Activate/deactivate jobs
- Select a job before clocking in
- Clock in/out and daily earnings

## Apply to your existing project

1. Stop Expo with `Ctrl+C`.
2. Copy this folder's contents into your Expo project and replace matching files.
3. Make sure the required packages are installed:

```bash
npx expo install expo-sqlite @expo/vector-icons
```

4. Restart with a clean cache:

```bash
npx expo start --clear
```

Your existing SQLite data will be retained. The migration adds the new job color and update timestamp fields automatically.
