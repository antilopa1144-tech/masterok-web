# Tile parity matrix

- Canonical calculator: `tile`
- Formula version: `tile-canonical-v1`
- Web adapter: `src/lib/calculators/formulas/tile.ts`
- Flutter adapter: `lib/domain/usecases/calculate_tile.dart`

## Canonical inputs
- Geometry: `length + width` or direct `area`
- Tile size: `tileWidthCm`, `tileHeightCm`
- Joints: `jointWidth`, optional `groutDepth`
- Layout: `layoutPattern`
- Room complexity: `roomComplexity`

## Canonical decisions
- Waste is deterministic and built from three pieces: layout pattern, room complexity, tile-format adjustment.
- `REC` keeps deterministic tile demand; MIN/MAX vary around it through field factors rather than hidden UI heuristics.
- Glue rate depends on tile format: small, medium, large, and XL.
- Grout depth can be explicit or derived automatically from tile size.
- Large format switches accessory recommendation from crosses to SVP packs.

## Intentional migration notes
- Web legacy `layingMethod` and `roomComplexity` are mapped to the richer canonical enums.
- Flutter legacy `tileSize` presets and custom width/height both normalize into canonical width/height in centimeters.
- Canonical straight layout now uses 10% base waste, matching the richer Flutter model. This changes some historical web outputs and is intentional.
