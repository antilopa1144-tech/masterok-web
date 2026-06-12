"use client";

import { useEffect, useRef } from "react";
import CalculatorSearch from "@/components/calculator/CalculatorSearch";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { ALL_CHECKLISTS } from "@/lib/checklists";
import { TOOLS_FOR_SEARCH } from "@/lib/tools/config";

const CHECKLISTS_FOR_SEARCH = ALL_CHECKLISTS.map(({ slug, title, description, category }) => ({
  slug,
  title,
  description,
  category,
}));

/**
 * Содержимое панели поиска в шапке. Вынесено в отдельный lazy-чанк:
 * каталог и чек-листы грузятся только при открытии поиска.
 */
export default function HeaderSearchPanel() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Автофокус на поле при открытии панели
  useEffect(() => {
    wrapperRef.current?.querySelector("input")?.focus();
  }, []);

  return (
    <div ref={wrapperRef}>
      <CalculatorSearch
        calculators={ALL_CALCULATORS_META}
        checklists={CHECKLISTS_FOR_SEARCH}
        tools={TOOLS_FOR_SEARCH}
      />
    </div>
  );
}
