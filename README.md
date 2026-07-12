# Timesheet Mobile — Milestone 18

Finalizes the initial iOS application identity and release metadata.

## Included

- iOS display name: `Timesheet Mobile`
- iOS bundle identifier: `com.puneet211086.timesheetmobile`
- Initial iOS build number
- iPhone-first configuration
- Face ID permission description
- Encryption compliance declaration
- Notification configuration plugin
- Light and dark splash backgrounds
- Android package identifier reserved for a future release
- Development, preview, and production EAS profiles

## Important asset note

This milestone preserves the image paths already used by the project:

- `assets/images/icon.png`
- `assets/images/splash-icon.png`
- `assets/images/notification-icon.png`
- Existing Android adaptive-icon images

Confirm that `notification-icon.png` exists before creating a native build. If it does not exist yet, either add the asset or remove the `icon` property from the `expo-notifications` plugin temporarily.

For the final App Store release, replace the current icon and splash images with finished brand artwork. The iOS App Store icon should be a 1024 × 1024 PNG without transparency.

## Install

Copy `app.json` and `eas.json` into the project root, replacing the existing files.

Then run:

```bash
npx expo install expo-notifications expo-local-authentication
npx expo-doctor
npx expo config --type public
npx expo start --clear
```

## Verify

Confirm the public Expo configuration shows:

```text
name: Timesheet Mobile
ios.bundleIdentifier: com.puneet211086.timesheetmobile
ios.buildNumber: 1
```

Do not change the bundle identifier after creating the App Store Connect app record unless you intentionally want a separate application.
