# Parquet parity matrix

- Canonical calculator: `parquet`
- Family: `piece_flooring`
- Formula version: `parquet-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/parquet.ts`
- Flutter adapter: `lib/domain/usecases/calculate_parquet.dart`

## Canonical inputs
- Geometry: `length + width` or direct `area`, optional `perimeter`
- Packaging: `packArea`
- Layout: `layoutProfileId`
- Optional accessories: `needUnderlayment`, `needPlinth`, `needGlue`, `doorThresholds`

## Canonical decisions
- Pack demand is deterministic from area and layout waste.
- Underlayment and plinth are calculated separately from parquet packs.
- Glue is optional and remains outside web UI by default, but is supported in canonical and Flutter flows.
- MIN/REC/MAX use the shared field-factor contract instead of local heuristics.

## Intentional migration notes
- Web `layingMethod` maps directly to canonical `layoutProfileId`.
- Flutter legacy `pattern` maps to the same canonical layout IDs.
- Old Flutter-only finish materials stay in the compatibility layer for now; shared canonical core covers the cross-platform parquet purchase model first.
