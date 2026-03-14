# Linoleum parity matrix

- Canonical calculator: `linoleum`
- Family: `roll_flooring`
- Formula version: `linoleum-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/linoleum.ts`
- Flutter adapter: `lib/domain/usecases/calculate_linoleum.dart`

## Canonical inputs
- Geometry: room dimensions or direct `area + roomWidth`
- Roll planning: `rollWidth`, `hasPattern`, `patternRepeatCm`
- Accessories: `needGlue`, `needPlinth`, `needTape`

## Canonical decisions
- Demand is driven by strip planning and purchase in linear meters with a fixed 0.1 m buying step.
- Pattern repeat affects only additional strip length, not an arbitrary percent reserve.
- Glue, primer, plinth, tape and cold-welding are calculated from the same cut plan.
- In `area + roomWidth` mode, room length is derived as `area / roomWidth`, while perimeter falls back to an estimated square-like perimeter unless an explicit `perimeter` is provided.

## Intentional migration notes
- Web `withGlue/withPlinth` and Flutter `withGlue/withPlinth` are normalized into canonical `needGlue/needPlinth`.
- Flutter V2 `marginCm` stays as a compatibility-only input and is not part of the shared canonical model.
- Canonical result uses linear meters as the source of truth; area-with-waste in legacy adapters becomes a derived compatibility field.
