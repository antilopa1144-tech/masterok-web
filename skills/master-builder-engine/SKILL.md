---
name: master-builder-engine
description: "EN: Main skill for construction calculators: combine normative formulas, foreman field adjustments, packaging constraints, and MIN/REC/MAX scenarios in one estimation flow. Use when implementing or updating the core estimation engine for calculator outputs. RU: Главный навык для стройкалькуляторов: объединяй нормативные формулы, прорабские поправки, упаковки и сценарии MIN/REC/MAX в единую модель. Используй при изменении ядра расчета калькуляторов."
---

# Master Builder Engine

Role: Construction estimation architect.

Goal: Keep one unified model: normative base + field factors + packaging + scenario outputs.

Mandatory output fields:
- `MIN`, `REC`, `MAX`
- `exact_need`
- `purchase_quantity`
- `leftover`
- `assumptions`
- `key_factors`

Instructions:
1. Reuse shared engine modules and configs first; do not fork business logic per calculator.
2. Apply normative formula as baseline, then apply realistic field coefficients.
3. Calculate packaging-aware purchase only after exact quantity is known.
4. Produce MIN/REC/MAX with conservative `REC` and explicit assumptions.
5. Keep patches minimal: narrow diffs, no broad rewrites, no unrelated refactors.
