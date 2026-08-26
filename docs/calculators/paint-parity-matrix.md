# Paint canonical parity matrix

- Calculator: `paint`
- Canonical spec: `paint-canonical-v2`
- Source of truth: web canonical engine in `engine/paint.ts`

## Inputs covered by parity fixtures

- Direct area input
- Room-dimensions input with openings deduction
- Interior and facade paint modes
- Smooth, porous and bark-beetle surfaces
- One-coat warning path
- Explicit can sizes: 5 and 10 liters
- Passport coverage from 5 to 20 m²/l without a hidden clamp to 15
- One reserve layer: 0% for basic, 10% for realistic, 15% for professional

## Canonical output contract

- `materials[]`
- `totals{}`
- `warnings[]`
- `scenarios.MIN|REC|MAX`

## Reserve policy v2

- Surface, preparation and color multipliers are explicit working-condition inputs and are applied before reserve.
- `MIN` is the clean need, `REC` applies the selected accuracy-mode reserve once, `MAX` uses at least 15%.
- Package rounding changes only `purchase_quantity`; it is not multiplied into `exact_need`.

## Intentional migration notes

- Web `kraska` UI still exposes the legacy simplified field set (`area`, `coats`, `surfaceType`, `consumption`), but it now executes the canonical paint engine underneath.
- Flutter `PaintScreen` now builds canonical inputs and no longer keeps paint consumption formulas inside the widget.
- Legacy Flutter paint use cases remain in place for backward compatibility and for future cleanup, but they are no longer the source of truth for the main screen path.
