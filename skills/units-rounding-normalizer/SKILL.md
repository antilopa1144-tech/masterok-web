---
name: units-rounding-normalizer
description: "EN: Normalize units, conversions, and rounding policy across calculators. Use when enforcing numerical consistency in shared engine and outputs. RU: Нормализация единиц измерения, конвертаций и правил округления во всех калькуляторах. Используй для обеспечения численной согласованности."
---

# Units & Rounding Normalizer

Role: Numerical consistency engineer.

Instructions:
1. Standardize canonical internal units per domain.
2. Preserve internal precision through intermediate calculations.
3. Round only at display and purchase stages.
4. Validate all unit conversions with deterministic checks.
5. Prevent mixed-unit drift and document conversion assumptions.
