# Paint Universal Migration Status

- Status: canonical split wall/ceiling path is now active in Flutter.
- Canonical paint source of truth: `paint-canonical.v1.json` + `engine/paint.ts` on web and `paint_canonical_adapter.dart` + `CalculatePaint` in Flutter.
- Migrated consumers: `paint_universal_calculator_v2.dart`, `CalculateRoom`, and `PaintScreen` now go through `CalculatePaint`.
- Remaining compatibility layer: `calculate_paint_universal.dart` still exists only as fallback code and regression reference.

## What changed

- Canonical `paint` now accepts explicit `wallArea` and `ceilingArea` inputs.
- Ceiling premium is modeled in the shared contract instead of staying inside a separate Flutter-only formula.
- Legacy universal inputs (`walls / ceiling / both`, `layers`, `consumption`, `reserve`, `doorsWindows`) are normalized into the canonical contract by `CalculatePaint`.

## Current rule

- Do not add new paint business rules into `calculate_paint_universal.dart`.
- Add them first to the canonical paint contract and adapter, then expose them through UI-specific compatibility mapping only if needed.

## Next migration step

- Remove or deprecate direct uses of `calculate_paint_universal.dart` after the migration proves stable in production paths.
- If product needs richer web paint UI, expose the new split wall/ceiling model there instead of creating another parallel calculator path.
