# Estimation Engine Spec (Skeleton)

## Goal
Provide a shared calculator core that combines:
1. Normative deterministic formula.
2. Field factors (foreman adjustments).
3. Packaging-aware purchase calculation.
4. Scenario outputs `MIN`, `REC`, `MAX`.

## Output Contract
Each scenario must include:
- `exact_need`
- `purchase_quantity`
- `leftover`
- `assumptions`
- `key_factors`
- `buy_plan`

## Core Files
- `engine/compute.ts`: orchestration and scenario computation.
- `engine/factors.ts`: factor model and scenario multipliers.
- `engine/packaging.ts`: purchasable package optimization.
- `engine/scenarios.ts`: scenario contracts.
- `engine/units.ts`: conversions and rounding policy.

## Configs
- `configs/factor-tables.json`: global factor ranges (`min`/`rec`/`max`).
- `configs/calculators/*.json`: calculator definitions and presets.

## Demo Calculator
- `configs/calculators/demo-putty-area-thickness.json`
- Formula: `area_m2 * thickness_mm * consumption_kg_per_m2_mm`
- Packaging: `25kg` bag.

## Migration Plan (Next)
Migrate calculators in batches of 5-10:
- map current formula to shared baseFormula,
- keep UI untouched,
- add deterministic tests per migrated calculator,
- ship minimal diff per batch.
