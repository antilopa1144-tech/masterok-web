# Canonical migration factory

## Goal
Move the remaining calculator catalog by family templates and scaffolds instead of one-off manual migrations.

## Families
- `dry_mix_area_based`: putty, plaster
- `liquid_coating_area_based`: primer, paint
- `roll_material`: wallpaper
- `piece_flooring`: tile, laminate

The registry for these families lives in [canonical-family-templates.json](/C:/masterok-web/configs/canonical-family-templates.json).

## Factory parts
- Family registry: canonical inputs, common outputs, fixture shape, example calculators.
- Scaffold generator: creates web spec/engine/formula/test/doc files and Flutter adapter/usecase/fixture/test files.
- Shared parity harnesses: remove repeated fixture loops from web and Flutter parity tests.

## Default workflow
1. Pick the family.
2. Run the scaffold generator.
3. Fill only the true domain parts: formula, material rules, warnings, legacy mappings.
4. Lock parity with shared fixture helpers.
5. Update registry and migration notes.

## Example
```powershell
node scripts/generate-canonical-scaffold.mjs --family piece_flooring --calculator parquet --slug parket --dry-run true
```

## Why this is faster
- The repetitive file topology is generated, not handwritten.
- Test harness boilerplate is shared.
- Family-specific migration notes are standardized.
- Engineers focus only on domain deltas, not on folder choreography.
