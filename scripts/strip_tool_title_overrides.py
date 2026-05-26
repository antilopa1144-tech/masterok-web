#!/usr/bin/env python3
"""Удалить ручное переопределение `title: META.title` в page.tsx инструментов.

После единой системы SEO-title собирается из ToolConfig.title +
fallback «… онлайн» (см. src/lib/tools/metadata.ts). Ручные
переопределения в page.tsx ломают единый стиль, их убираем.

Description (META.description) сохраняем — он действительно нужен.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INSTRUMENTY = ROOT / "src" / "app" / "instrumenty"

# Регэксп ловит:
#     export const metadata: Metadata = buildToolPageMetadata("<slug>", {
#       title: META.title,
#       description: META.description,
#     });
#
# Заменяет на тот же блок без строки "title: META.title,".
PATTERN = re.compile(
    r'(export const metadata: Metadata = buildToolPageMetadata\([^,]+,\s*\{\s*)'
    r'title:\s*META\.title,\s*\n\s*(description:)'
)


def main() -> int:
    changed = 0
    for path in sorted(INSTRUMENTY.glob("*/page.tsx")):
        text = path.read_text(encoding="utf-8")
        new_text, n = PATTERN.subn(r"\1\2", text)
        if n > 0:
            path.write_text(new_text, encoding="utf-8", newline="\n")
            print(f"{path.parent.name}: stripped title override")
            changed += 1
    print(f"\nTotal: {changed} files updated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
