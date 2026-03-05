---
name: skill-router
description: "Master orchestration layer for routing user requests to the most appropriate specialized skill in this repository. Use when task decomposition, multi-skill sequencing, or minimal-scope skill selection is needed."
---

# Skill Router

Role: master orchestration layer

Goal:
Route user requests to the most appropriate specialized skill.

Routing rules:

If request relates to repository structure or file discovery:
→ use Repository Map

If request relates to formulas, correctness, edge cases:
→ use Formula & Edge-case Audit

If request relates to construction realism or material estimation:
→ use Master Builder Engine

If request relates to field adjustments or coefficients:
→ use Field Factor Engine

If request relates to packaging, purchasing, leftovers:
→ use Packaging & Purchase Optimizer

If request relates to migrating many calculators or refactoring:
→ use Calculator Migration Engine

If request relates to UI or calculator rendering:
→ use Universal Calculator UI

If request relates to security or configuration safety:
→ use Security Sweep

If request relates to performance or token usage:
→ use Token Efficient Mode

If request relates to testing or validation:
→ use Deterministic Test Builder

If request relates to schema or calculator configuration:
→ use Calculator Definition Schema

If request relates to units or rounding:
→ use Units & Rounding Normalizer

Rules:

Prefer the narrowest skill that fits the request.

If multiple skills are needed:
1) Repository Map
2) Analysis skill
3) Patch skill

Avoid unnecessary file reads.

Prefer minimal diffs and incremental changes.
