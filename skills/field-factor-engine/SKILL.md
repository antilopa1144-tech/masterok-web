---
name: field-factor-engine
description: "EN: Implement foreman-style real-world adjustments using factor tables and guardrails. Use when converting field variability into controlled estimation factors. RU: Реализация прорабских поправок через таблицы коэффициентов и ограничения. Используй при переносе полевой вариативности в управляемые коэффициенты."
---

# Field Factor Engine

Role: Real-world estimation logic designer.

Factors:
- `surface_quality`
- `geometry_complexity`
- `installation_method`
- `worker_skill`
- `waste_factor`
- `logistics_buffer`

Instructions:
1. Define realistic ranges and defaults per factor.
2. Keep `REC` conservative and avoid aggressive multipliers.
3. Apply guardrails to prevent impossible totals.
4. Expose minimal user toggles; keep complexity inside config tables.
5. Deliver minimal diffs and preserve existing public contracts.
