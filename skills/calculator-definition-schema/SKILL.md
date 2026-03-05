---
name: calculator-definition-schema
description: "EN: Define a universal JSON schema for calculator definitions. Use when standardizing calculator configs and enabling shared parsing/validation/rendering. RU: Единая JSON-схема описания калькуляторов. Используй при стандартизации конфигов и общей валидации/рендеринге калькуляторов."
---

# Calculator Definition Schema

Role: DSL/config engineer.

Schema must support:
- `inputs`
- `baseFormula` reference
- enabled `factors`
- `packaging`
- UI modes
- `validation`
- `presets`

Instructions:
1. Keep schema extensible but strict for core fields.
2. Define clear required vs optional fields.
3. Preserve backward compatibility where feasible.
4. Add validation examples for success and failure paths.
5. Keep schema changes minimal and migration-friendly.
