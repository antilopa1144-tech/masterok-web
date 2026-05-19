---
name: shared-formulas-sync
description: Use when changing or auditing calculation logic shared between Flutter app and Next.js site.
---

# Shared formulas sync

Goal: keep calculation logic identical across Flutter and Next.js.

Procedure:
1. Search repository for all implementations of the formula.
2. Identify the current source of truth.
3. Compare Flutter and Next.js implementations.
4. Update both implementations if duplicates exist.
5. Review labels, hints, validation, and tests.
6. Run checks.

Rules:
- Never update only one platform.
- Treat rounding differences as potential bugs.
- Do not change formula meaning unless explicitly required.