# Paint canonical parity matrix

- Calculator: `paint`
- Canonical spec: `paint-canonical-v1`
- Source of truth: web canonical engine in `engine/paint.ts`

## Inputs covered by parity fixtures

- Direct area input
- Room-dimensions input with openings deduction
- Interior and facade paint modes
- Smooth, porous and bark-beetle surfaces
- One-coat warning path
- Explicit can sizes: 5 and 10 liters

## Canonical output contract

- `materials[]`
- `totals{}`
- `warnings[]`
- `scenarios.MIN|REC|MAX`

## Intentional migration notes

- Web `kraska` UI still exposes the legacy simplified field set (`area`, `coats`, `surfaceType`, `consumption`), but it now executes the canonical paint engine underneath.
- Flutter `PaintScreen` now builds canonical inputs and no longer keeps paint consumption formulas inside the widget.
- Legacy Flutter paint use cases remain in place for backward compatibility and for future cleanup, but they are no longer the source of truth for the main screen path.
