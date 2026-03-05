# Automations

This project currently stores automation scenarios as documentation playbooks.
Use these playbooks to run recurring checks and migration batches with minimal risk.

## A) Commit/PR Sanity Check

Purpose: block regressions in calculator math and output contracts.

Checklist:
1. Audit changed formulas for edge cases and unit consistency.
2. Validate packaging logic (`exact_need`, `purchase_quantity`, `leftover`, buy plan).
3. Validate rounding policy (internal precision, display rounding, purchase rounding).
4. Run targeted tests for touched calculators and engine modules.
5. Produce a short diff summary with risk notes.

Trigger:
- Every PR touching `src/lib/calculators/**`, `engine/**`, `configs/**`, or `tests/**`.

Output:
- Findings grouped by severity.
- Minimal remediation patch list.

## B) Weekly Dependency & Security Audit

Purpose: detect vulnerable or risky patterns before release.

Checklist:
1. Run security sweep for secret exposure and unsafe patterns.
2. Review dependency updates and deprecations.
3. Generate dependency risk summary and action list.
4. Ensure no `.env` values or credentials appear in tracked files.

Trigger:
- Weekly (recommended: Monday morning).

Output:
- Security findings with severity.
- Dependency report with actionable upgrades.

## C) Migration Batch Runner (Manual)

Purpose: migrate calculators to the shared engine safely in small batches.

Checklist:
1. Select next 5-10 calculators.
2. Move formula logic to shared engine/config format.
3. Keep UI behavior stable (no redesign).
4. Add deterministic tests for migrated calculators.
5. Produce diff summary: migrated calculators, tests added, known risks.

Trigger:
- Manual, by engineer command.

Output:
- Batch migration report.
- Commit-ready patch set.
