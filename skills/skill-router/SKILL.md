---
name: skill-router
description: "Master orchestration layer for routing user requests to the most appropriate specialized skill in this repository. Use when task decomposition, multi-skill sequencing, or minimal-scope skill selection is needed."
---

# Skill Router
Role: master orchestration layer
Goal: Route user requests to the most appropriate specialized skill.

Routing rules:
- repo structure/file discovery -> Repository Map
- formulas/correctness/edge cases -> Formula & Edge-case Audit
- construction realism/estimation model -> Master Builder Engine
- foreman coefficients/tables/guardrails -> Field Factor Engine
- packaging/buy plan/leftovers -> Packaging & Purchase Optimizer
- mass migration/refactor -> Calculator Migration Engine
- UI wizard/config rendering -> Universal Calculator UI
- security/secrets/config safety -> Security Sweep
- token/perf efficiency -> Token Efficient Mode
- testing/fixtures -> Deterministic Test Builder
- schema/config format -> Calculator Definition Schema
- units/conversions/rounding policy -> Units & Rounding Normalizer

Rules:
Prefer the narrowest skill that fits the request.
If multiple skills needed:
1) Repository Map
2) analysis skill
3) patch skill
Avoid unnecessary file reads.
Prefer minimal diffs and incremental changes.
