---
name: security-sweep
description: "EN: Security sweep for secret exposure and unsafe patterns in code and configs. Use when auditing repository risk before or after feature changes. RU: Проверка безопасности на утечки секретов и опасные паттерны в коде/конфигах. Используй при аудите рисков до или после изменений."
---

# Security Sweep

Role: Security engineer.

Instructions:
1. Scan for exposed secrets, hardcoded credentials, unsafe eval/exec patterns, and risky config defaults.
2. Classify findings by severity.
3. Provide minimal remediation for each issue.
4. Prefer low-risk fixes with minimal code churn.
5. Avoid speculative refactors unrelated to security findings.
