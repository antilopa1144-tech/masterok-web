#!/usr/bin/env python3
"""Переписать metaTitle во всех файлах калькуляторов на единый шаблон.

ТРЁХУРОВНЕВАЯ СИСТЕМА (выбирается автоматически по длине названия,
чтобы итоговый title <head> с суффиксом « — Мастерок» влез в 60 символов
— столько в среднем показывает Google/Яндекс перед обрезкой):

  L (long, ≤ 60):  Калькулятор X: расчёт материалов онлайн
  C (compact):     Калькулятор X: материалы онлайн
  N (no suffix):   Калькулятор X

Суффикс « — Мастерок» подставляется автоматически Next.js через title.template
в src/app/layout.tsx — здесь только base.

Запуск:  PYTHONIOENCODING=utf-8 python scripts/rewrite_meta_titles.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORMULAS_DIR = ROOT / "src" / "lib" / "calculators" / "formulas"

PATTERN = re.compile(
    r'(metaTitle:\s*withSiteMetaTitle\(")([^"]+)("\))'
)

# Брендовый суффикс будет добавлен Next.js, но нам нужно знать его длину,
# чтобы не превысить 60 символов в итоговом <title>.
BRAND_SUFFIX = " — Мастерок"
MAX_TOTAL = 60


def extract_subject(old_title: str) -> str:
    """Из «Калькулятор XYZ: расчёт материалов онлайн» (или старого формата
    «Калькулятор XYZ | …») вытащить «XYZ»."""
    # Если уже наш формат — отрезаем хвост.
    cleaned = old_title.replace(": расчёт материалов онлайн", "")
    cleaned = cleaned.replace(": материалы онлайн", "")
    # Старые форматы: всё после разделителя | / — / : выкидываем.
    cleaned = re.split(r"\s*[|—–:]\s*", cleaned, maxsplit=1)[0].strip()
    if cleaned.lower().startswith("калькулятор "):
        cleaned = cleaned[len("Калькулятор "):]
    # Хвост «онлайн» — убираем, вернётся уже в новой схеме.
    cleaned = re.sub(r"\s+онлайн\s*$", "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned


def build_new_title(subject: str) -> tuple[str, str]:
    """Возвращает (новый_title, уровень_L/C/N)."""
    candidates = [
        ("L", f"Калькулятор {subject}: расчёт материалов онлайн"),
        ("C", f"Калькулятор {subject}: материалы онлайн"),
        ("N", f"Калькулятор {subject}"),
    ]
    for level, title in candidates:
        if len(title + BRAND_SUFFIX) <= MAX_TOTAL:
            return title, level
    # Если ничего не влезло — берём самый короткий (N).
    return candidates[-1][1], "N"


def process_file(path: Path) -> list[tuple[str, str, str]]:
    text = path.read_text(encoding="utf-8")
    changes = []

    def repl(m: re.Match[str]) -> str:
        old = m.group(2)
        subject = extract_subject(old)
        new, level = build_new_title(subject)
        changes.append((level, old, new))
        return f"{m.group(1)}{new}{m.group(3)}"

    new_text = PATTERN.sub(repl, text)
    if changes:
        path.write_text(new_text, encoding="utf-8", newline="\n")
    return changes


def main() -> int:
    total = 0
    by_level = {"L": 0, "C": 0, "N": 0}
    for path in sorted(FORMULAS_DIR.glob("*.ts")):
        changes = process_file(path)
        if not changes:
            continue
        total += len(changes)
        for level, old, new in changes:
            by_level[level] += 1
            print(f"  [{level}] {path.name}")
            print(f"      {new}")

    print()
    print(f"Total replacements: {total}")
    print(f"  L (long form):    {by_level['L']}")
    print(f"  C (compact form): {by_level['C']}")
    print(f"  N (name only):    {by_level['N']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
