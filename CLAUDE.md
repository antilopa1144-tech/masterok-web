# Project instructions

This repository contains:
- Flutter mobile app
- Next.js website
- Shared business logic and formulas that must stay consistent across platforms

## Core rules
1. Never duplicate calculation logic across Flutter and Next.js if a shared-core approach is possible.
2. Before editing formulas, search the whole repository for all implementations of the same logic.
3. If a formula changes, update every affected surface:
   - Flutter UI
   - Next.js UI
   - validators
   - tests
   - labels/help text if needed
4. Prefer minimal, targeted edits over broad rewrites.
5. Preserve Russian UX copy unless explicitly asked to rewrite text.
6. Do not invent requirements. If unclear, infer only from existing code.
7. Keep architecture consistent with the current project patterns.
8. After code changes, always run relevant checks.

## Working style
- First inspect
- Then propose concise plan
- Then implement
- Then run checks
- Then give a short report:
  - changed files
  - what was fixed
  - risks / follow-ups

## Flutter rules
- Respect existing state management choice in the repo
- Use null-safe Dart
- Avoid breaking widget APIs unless necessary
- Keep UI responsive and production-oriented

## Next.js rules
- Respect existing routing structure
- Reuse shared utilities where possible
- Do not break SEO/meta behavior
- Keep components modular

## Formula policy
Any change to construction formulas must be treated as high risk.
Always:
- locate all formula usages
- compare mobile/web outputs
- add or update tests where possible
- document assumptions in the final report