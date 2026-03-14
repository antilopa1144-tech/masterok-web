# Wallpaper parity matrix

- Canonical calculator: `wallpaper`
- Formula version: `wallpaper-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/wallpaper.ts`
- Flutter adapter: `lib/domain/usecases/calculate_wallpaper.dart`

## Canonical inputs
- Geometry: `perimeter + wallHeight`, `roomWidth + roomLength + roomHeight`, or `area + wallHeight`
- Openings: exact `openingsArea` or count-based `doorsCount/windowsCount`
- Roll spec: `rollWidth`, `rollLength`, `rapport`
- Policy: `wallpaperType`, `reservePercent`, `reserveRolls`

## Intentional decisions
- Canonical strip length uses rapport rounding and adds `0.05 м` trim only when rapport is present.
- Roll count is derived from net wall area and strips-per-roll, not from UI-local heuristics.
- Web keeps its historical `+1` reserve as explicit `reserveRolls = 1` in the adapter.
- Flutter keeps `reservePercent` support as an explicit input for compatibility with legacy tests.
- Glue and primer are part of the canonical output; Flutter still maps them back into legacy result keys.

## Known deviations from pre-canonical behavior
- Web rapport cases can now require more rolls than before because trim allowance is accounted for.
- Web glue is now type-aware in the domain model, but the current web UI uses the default wallpaper type until a dedicated selector is exposed.
- Flutter no longer owns wallpaper math in widget-facing flows; it adapts the canonical contract.
