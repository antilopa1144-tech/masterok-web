# Plaster Parity Matrix

- Calculator id: `plaster`
- Formula version: `plaster-canonical-v1`
- Canonical web host: `C:\masterok-web\engine\plaster.ts`
- Flutter adapter: `C:\probrab1\lib\domain\usecases\plaster_canonical_adapter.dart`
- Flutter compatibility use case: `C:\probrab1\lib\domain\usecases\calculate_plaster.dart`

## Covered fixture cases

- `room_gypsum_default`
  - Dimensions path
  - Gypsum plaster
  - Concrete substrate
  - Even wall profile
  - No mesh warning

- `area_cement_old_brick_uneven`
  - Direct area path
  - Cement plaster
  - Old brick substrate
  - Very uneven wall profile
  - High-consumption deterministic case

- `small_area_thick_gypsum_warning`
  - Direct area path
  - Thick gypsum layer
  - Mesh and small-area warnings
  - Packaging rounding stress case

## Intentional compatibility notes

- Flutter legacy `type: 1|2` is normalized to canonical `plasterType: 0|1`.
- Flutter legacy area-only path keeps its existing result keys (`plasterBags`, `plasterKg`, `primerLiters`, `meshArea`, `beacons`, `warningThickLayer`, `tipObryzg`) through adapter mapping.
- Web keeps its room-dimensions UX and now uses the canonical engine instead of local formula math.
