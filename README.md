# Timesheet Mobile — Milestone 20

Adds a polished first-launch onboarding experience.

## Included

- Four-step first-launch onboarding
- Local-first privacy explanation
- First job name and hourly-rate setup
- Dashboard, reports, and backup introduction
- Completion stored in `app_settings`
- Onboarding appears only once
- Existing Face ID and Preferences providers preserved
- Success haptic on mobile
- No new npm packages
- Replaced current confirmToggle with web-safe version

## Install

Copy these folders into the project root and replace matching files:

- `app/`
- `components/`
- `database/`

Then restart:

```bash
npx expo start --clear
```

## Testing an existing installation

Existing databases will receive:

```text
onboarding_completed = false
```

so the onboarding appears once after installing this milestone.

To test it again later, run this temporarily from a debug action or SQLite viewer:

```sql
UPDATE app_settings
SET value = 'false'
WHERE key = 'onboarding_completed';
```

Then restart the app.

## Test flow

1. Launch the app.
2. Move through the welcome and privacy screens.
3. Rename the starter job and change its hourly rate.
4. Finish onboarding.
5. Confirm the Home screen uses the updated job.
6. Restart the app and confirm onboarding does not appear again.
