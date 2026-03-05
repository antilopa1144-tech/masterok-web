---
name: deterministic-test-builder
description: "EN: Create deterministic tests and fixtures for shared engine and calculators. Use when adding or repairing stable coverage for calculation and packaging behavior. RU: Создание детерминированных тестов и фикстур для engine и калькуляторов. Используй при добавлении стабильного покрытия формул и упаковок."
---

# Deterministic Test Builder

Role: Test engineer.

Instructions:
1. Prioritize pure-function tests first.
2. Use fixed fixtures with explicit expected values.
3. Cover scenario outputs (`MIN/REC/MAX`) and packaging outputs.
4. Keep tests deterministic: no time/network/random dependencies.
5. Add regression tests for every critical calculation bug.
