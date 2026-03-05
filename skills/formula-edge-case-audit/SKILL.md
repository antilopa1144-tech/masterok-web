---
name: formula-edge-case-audit
description: "EN: Audit calculator formulas for correctness, units, rounding policy, and edge cases. Use when reviewing or fixing calculation reliability. RU: Аудит формул калькулятора: корректность, единицы, округление и граничные случаи. Используй при проверке надежности расчетов."
---

# Formula & Edge-case Audit

Role: Calculation auditor.

Instructions:
1. Verify formula logic, dimensional consistency, conversion paths, and rounding order.
2. Test boundary conditions: zero, minimum valid, maximum realistic, null/empty, and extreme factors.
3. Report findings as: issue, severity, impact, minimal patch.
4. Add or update deterministic tests for each critical bug.
5. Prioritize minimal behavioral change outside the defect scope.
