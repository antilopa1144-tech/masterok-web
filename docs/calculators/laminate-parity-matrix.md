# Laminate parity matrix

- Canonical calculator: `laminate`
- Formula version: `laminate-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/laminate.ts`
- Flutter adapter: `lib/domain/usecases/calculate_laminate.dart`

## Canonical inputs
- Geometry: `length + width` or direct `area`, optional `perimeter`
- Packaging: `packArea`
- Layout: `layoutProfileId`
- Reserve: explicit `reservePercent`
- Accessories: `hasUnderlayment`, `underlaymentRollArea`, `doorThresholds`
- Metadata: `underlayType`, `laminateClass`, `laminateThickness`

## Canonical decisions
- Waste is deterministic and built from the chosen layout profile plus a small-room adjustment.
- If explicit reserve is higher than layout waste, reserve wins. This removes hidden product logic and keeps the result explainable.
- Laminate is rounded by package area, while plinth, thresholds, wedges and vapor barrier are calculated separately.
- MIN/REC/MAX are driven by field factors, not by UI-specific heuristics.

## Intentional migration notes
- Web legacy `layingMethod` and `offsetMode` are mapped to the richer canonical layout profiles.
- Flutter legacy `layoutPattern` is mapped to the same canonical profiles, so both platforms now share one waste model.
- Web now exposes `reservePercent` and `doorThresholds` explicitly instead of hiding them in local defaults.
