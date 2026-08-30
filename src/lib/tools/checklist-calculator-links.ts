import { getCanonicalCalculatorPath } from "@/lib/calculators/canonical-path";

export interface ChecklistCalculatorLink {
  checklistSlug: string;
  checklistTitle: string;
  calculatorSlug: string;
  calculatorCategorySlug: string;
  calculatorTitle: string;
  calculatorCta: string;
  checklistCta: string;
}

export const CHECKLIST_CALCULATOR_LINKS = [
  {
    checklistSlug: "ukladka-plitki",
    checklistTitle: "Укладка плитки",
    calculatorSlug: "plitka",
    calculatorCategorySlug: "poly",
    calculatorTitle: "Калькулятор плитки",
    calculatorCta: "Рассчитать плитку, клей и затирку",
    checklistCta: "Открыть чек-лист укладки плитки",
  },
  {
    checklistSlug: "styazhka-pola",
    checklistTitle: "Стяжка пола",
    calculatorSlug: "styazhka",
    calculatorCategorySlug: "poly",
    calculatorTitle: "Калькулятор стяжки пола",
    calculatorCta: "Рассчитать смесь и материалы для стяжки",
    checklistCta: "Открыть чек-лист устройства стяжки",
  },
  {
    checklistSlug: "montazh-gipsokartona",
    checklistTitle: "Монтаж гипсокартона",
    calculatorSlug: "gipsokarton",
    calculatorCategorySlug: "steny",
    calculatorTitle: "Калькулятор гипсокартона",
    calculatorCta: "Рассчитать листы, профиль и крепёж",
    checklistCta: "Открыть чек-лист монтажа гипсокартона",
  },
  {
    checklistSlug: "pokraska-sten",
    checklistTitle: "Покраска стен",
    calculatorSlug: "kraska",
    calculatorCategorySlug: "otdelka",
    calculatorTitle: "Калькулятор краски",
    calculatorCta: "Рассчитать краску по площади и слоям",
    checklistCta: "Открыть чек-лист покраски стен",
  },
  {
    checklistSlug: "pokleivaniye-oboev",
    checklistTitle: "Поклейка обоев",
    calculatorSlug: "oboi",
    calculatorCategorySlug: "otdelka",
    calculatorTitle: "Калькулятор обоев",
    calculatorCta: "Рассчитать рулоны с учётом раппорта",
    checklistCta: "Открыть чек-лист поклейки обоев",
  },
  {
    checklistSlug: "ustroystvo-fundamenta",
    checklistTitle: "Устройство ленточного фундамента",
    calculatorSlug: "lentochnyy-fundament",
    calculatorCategorySlug: "fundament",
    calculatorTitle: "Калькулятор ленточного фундамента",
    calculatorCta: "Рассчитать бетон, арматуру и опалубку по проекту",
    checklistCta: "Открыть чек-лист устройства фундамента",
  },
  {
    checklistSlug: "uteplenie-fasada",
    checklistTitle: "Утепление фасада минватой (мокрый фасад)",
    calculatorSlug: "uteplenie-fasada-minvatoj",
    calculatorCategorySlug: "fasad",
    calculatorTitle: "Калькулятор утепления фасада минватой",
    calculatorCta: "Рассчитать материалы мокрого фасада",
    checklistCta: "Открыть чек-лист утепления фасада",
  },
  {
    checklistSlug: "montazh-krovli",
    checklistTitle: "Монтаж кровли из металлочерепицы",
    calculatorSlug: "krovlya",
    calculatorCategorySlug: "krovlya",
    calculatorTitle: "Калькулятор материалов кровли",
    calculatorCta: "Перевести проект кровли в материалы к покупке",
    checklistCta: "Открыть чек-лист монтажа кровли",
  },
  {
    checklistSlug: "razvodka-elektriki",
    checklistTitle: "Разводка электрики в квартире",
    calculatorSlug: "elektrika",
    calculatorCategorySlug: "inzhenernye",
    calculatorTitle: "Калькулятор электропроводки",
    calculatorCta: "Оценить кабель, автоматы, УЗО и розетки",
    checklistCta: "Открыть чек-лист разводки электрики",
  },
  {
    checklistSlug: "ustanovka-santehniki",
    checklistTitle: "Установка сантехники в ванной",
    calculatorSlug: "vannaya-komnata",
    calculatorCategorySlug: "otdelka",
    calculatorTitle: "Калькулятор ванной комнаты",
    calculatorCta: "Рассчитать плитку, клей и гидроизоляцию ванной",
    checklistCta: "Открыть чек-лист работ в ванной",
  },
] as const satisfies readonly ChecklistCalculatorLink[];

export function getChecklistLinkForCalculator(
  calculatorSlug: string,
): ChecklistCalculatorLink | null {
  return CHECKLIST_CALCULATOR_LINKS.find(
    (link) => link.calculatorSlug === calculatorSlug,
  ) ?? null;
}

export function getCalculatorLinkForChecklist(
  checklistSlug: string,
): ChecklistCalculatorLink | null {
  return CHECKLIST_CALCULATOR_LINKS.find(
    (link) => link.checklistSlug === checklistSlug,
  ) ?? null;
}

export function buildChecklistHrefForCalculator(calculatorSlug: string): string | null {
  const link = getChecklistLinkForCalculator(calculatorSlug);
  return link ? `/instrumenty/chek-listy/${link.checklistSlug}/` : null;
}

export function buildCalculatorHrefForChecklist(checklistSlug: string): string | null {
  const link = getCalculatorLinkForChecklist(checklistSlug);
  return link
    ? getCanonicalCalculatorPath({
        categorySlug: link.calculatorCategorySlug,
        slug: link.calculatorSlug,
      })
    : null;
}
