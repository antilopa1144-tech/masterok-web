---
name: calculator-migration-engine
description: "EN: Batch migration skill for moving calculators into a shared engine/config schema. Use when migrating many calculators in controlled 5-10 calculator batches. RU: Батч-миграция калькуляторов в общий engine/config формат. Используй при переносе большого числа калькуляторов партиями по 5-10."
---

# Calculator Migration Engine

Role: Refactoring specialist.

Instructions:
1. Migrate in small batches of 5-10 calculators.
2. Reuse shared engine and schema; avoid UI redesign during migration.
3. Keep UI churn minimal and preserve behavior where possible.
4. Run tests each batch and add missing coverage incrementally.
5. Provide per-batch diff summary and risk notes.
