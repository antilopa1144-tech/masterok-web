# Self-leveling parity matrix

- Canonical calculator: `self-leveling`
- Family: `dry_mix_area_based`
- Formula version: `self-leveling-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/self-leveling.ts`
- Flutter adapter: `lib/domain/usecases/calculate_self_leveling_floor.dart`

## Canonical inputs
- Geometry: room dimensions or direct `area`
- Mixture setup: `thickness`, `mixtureType`, `bagWeight`
- Compatibility override: `consumptionOverride`

## Canonical decisions
- Normative consumption is driven by mixture type unless a compatibility-only `consumptionOverride` is provided.
- The canonical exact need already includes the standard 5% reserve factor before scenario scaling.
- Primer is packaged in `5 l` cans; damper tape is packaged in `25 m` rolls.

## Intentional migration notes
- Flutter legacy `consumption` is now mapped into canonical `consumptionOverride`; it no longer owns a separate formula path.
- Flutter generic registry can stay on the compact field set for now; the domain result is canonical even when the UI does not expose every web option.
