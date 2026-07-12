# Timesheet Mobile — Milestone 15

Adds an optional local app lock using Face ID, Touch ID, or device authentication.

## Included
- App-lock switch in Settings
- Device capability and enrollment checks
- Authentication before enabling the lock
- Lock when the app returns from the background
- Unlock screen with retry support
- Device passcode fallback
- Web-safe behavior
- Safe `app_settings` migration

## Install
Copy these folders/files into your project and replace matching files:

- `app/`
- `components/`
- `database/`

Install the Expo-compatible dependency:

```bash
npx expo install expo-local-authentication
npx expo start --clear
```

## Required app.json change
Do **not** replace your full `app.json`. Merge the following entry into the existing `expo.plugins` array:

```json
[
  "expo-local-authentication",
  {
    "faceIDPermission": "Allow Timesheet Mobile to use Face ID to protect your timesheets."
  }
]
```

The included `app-json-plugin-snippet.json` shows the required structure.

## Testing limitation
Face ID is not supported in Expo Go on iOS. Test Face ID with an iOS development build or TestFlight build. Touch ID/device authentication availability depends on the device and environment.

## Test
1. Open Settings.
2. Enable **Require Face ID or device authentication**.
3. Authenticate when prompted.
4. Send the app to the background.
5. Reopen it and confirm the lock screen appears.
6. Disable the setting and confirm the app no longer locks.
