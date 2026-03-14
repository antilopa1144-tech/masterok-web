# Primer canonical parity matrix

- Calculator: `mixes_primer`
- Canonical spec: `primer-canonical-v1`
- Source of truth: web canonical engine in `engine/primer.ts`

## Inputs covered by parity fixtures

- Direct area input
- Room dimensions input
- Deep penetration primer
- Contact primer
- GKL primer
- Different can sizes: 5, 10, 15 liters

## Canonical output contract

- `materials[]`
- `totals{}`
- `warnings[]`
- `scenarios.MIN|REC|MAX`

## Intentional migration notes

- Web formula taxonomy remains canonical for `surfaceType` and `primerType`.
- Flutter room-dimensions support is allowed in the canonical contract even though the current web UI still exposes only direct area.
- Flutter specialized `PrimerCalculatorScreen` is not switched yet; this phase only establishes canonical domain logic and parity fixtures.
