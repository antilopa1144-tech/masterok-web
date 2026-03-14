# Putty parity matrix

- Calculator: `putty`
- Formula version: `putty-canonical-v1`
- Canonical host: `C:\masterok-web`
- Flutter consumer: `C:\probrab1`

## Canonical inputs

- `inputMode`
- `length`
- `width`
- `height`
- `area`
- `surface`
- `puttyType`
- `bagWeight`
- `qualityClass`
- `layers`

## Canonical output

- `materials[]`
- `totals{}`
- `warnings[]`
- `scenarios.MIN|REC|MAX`

## Reference fixtures

- Web: `tests/fixtures/putty-canonical-parity.json`
- Flutter: `test/fixtures/putty_canonical_parity.json`

## Intentional deviations

- `qualityClass=0` means `legacy_web` and preserves current web defaults.
- `qualityClass=1..3` is now accepted by the canonical contract and maps to economy/standard/premium consumption profiles.
- Flutter legacy `type/qualityClass/layers` flow still exists for backward compatibility.
- Flutter adapts canonical output back into legacy `CalculatorResult.values` for existing screens and tests.
