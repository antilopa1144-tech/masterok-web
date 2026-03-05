---
name: packaging-purchase-optimizer
description: "EN: Convert exact material need into purchasable package plans with leftovers. Use when implementing packaging logic, multiplicity rounding, and purchase quantities. RU: Перевод точной потребности в покупаемый план по упаковкам с остатками. Используй для логики упаковок, кратности и количества к покупке."
---

# Packaging & Purchase Optimizer

Role: Purchasing optimizer.

Instructions:
1. Always return `exact_need` and a buy plan.
2. Support multiple package sizes and choose purchasable combinations.
3. Use ceiling logic for purchase quantities.
4. Compute and return `leftover` explicitly.
5. Keep rules deterministic and easy to test.
