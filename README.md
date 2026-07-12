# Timesheet Mobile — Milestone 22

Adds configurable advanced overtime rules and a shared payroll engine.

## Included

- Enable or disable overtime per job
- Configurable weekly overtime threshold
- Configurable daily overtime threshold
- Configurable double-time threshold
- Custom overtime and double-time multipliers
- Shared regular/overtime/double-time calculation engine
- Dashboard daily and weekly earnings use the same engine
- Reports classify regular, overtime, and double-time hours consistently
- Existing jobs migrate to weekly overtime after 40 hours at 1.5×
- Daily overtime and double time default to disabled
- Web-safe deactivate/reactivate confirmation retained
- No new npm packages

## Install

Copy these folders into the project root and replace matching files:

- `app/`
- `database/`
- `hooks/`
- `services/`
- `types/`
- `utils/`

Then restart:

```bash
npx expo start --clear
```

## Migration defaults

Existing jobs receive:

- Overtime enabled
- Weekly overtime enabled
- Weekly threshold: 40 hours
- Overtime multiplier: existing value, normally 1.5×
- Daily overtime disabled
- Daily threshold: 8 hours
- Double time disabled
- Double-time threshold: 12 hours
- Double-time multiplier: 2×

## Test scenarios

### Weekly overtime
1. Set weekly overtime to 40 hours.
2. Add five 8-hour shifts and one 2-hour shift for the same job.
3. Verify 40 regular hours and 2 overtime hours.

### Daily overtime
1. Disable weekly overtime.
2. Enable daily overtime after 8 hours.
3. Add a 10-hour shift.
4. Verify 8 regular and 2 overtime hours.

### Double time
1. Enable daily overtime after 8 hours.
2. Enable double time after 12 hours.
3. Add a 14-hour shift.
4. Verify 8 regular, 4 overtime, and 2 double-time hours.

### Combined daily and weekly
1. Enable both daily and weekly overtime.
2. Daily overtime is classified first.
3. Weekly overtime promotes only remaining regular hours, avoiding double counting.

## Important

Overtime laws vary by location and employment arrangement. The app provides configurable estimates and should not be presented as legal or payroll advice.
