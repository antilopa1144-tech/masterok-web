import { getCanonicalCalculatorPath } from "@/lib/calculators/canonical-path";

export const MATERIAL_COMPARISON_TOOL_SLUG = "sravnenie-materialov";

export const MATERIAL_COMPARISON_CATEGORY_IDS = [
  "flooring",
  "walls",
  "insulation",
  "roofing",
  "ceilings",
] as const;

export type MaterialComparisonCategoryId = typeof MATERIAL_COMPARISON_CATEGORY_IDS[number];

export interface MaterialComparisonCalculatorLink {
  calculatorSlug: string;
  calculatorCategorySlug: string;
  calculatorTitle: string;
}

const CALCULATOR_LINKS = {
  laminat: { calculatorSlug: "laminat", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор ламината" },
  linoleum: { calculatorSlug: "linoleum", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор линолеума" },
  parket: { calculatorSlug: "parket", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор паркетной доски" },
  plitka: { calculatorSlug: "plitka", calculatorCategorySlug: "poly", calculatorTitle: "Калькулятор плитки" },
  oboi: { calculatorSlug: "oboi", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор обоев" },
  kraska: { calculatorSlug: "kraska", calculatorCategorySlug: "otdelka", calculatorTitle: "Калькулятор краски" },
  "dekorativnaya-shtukaturka": { calculatorSlug: "dekorativnaya-shtukaturka", calculatorCategorySlug: "fasad", calculatorTitle: "Калькулятор декоративной штукатурки" },
  "paneli-dlya-sten": { calculatorSlug: "paneli-dlya-sten", calculatorCategorySlug: "steny", calculatorTitle: "Калькулятор панелей для стен" },
  uteplenie: { calculatorSlug: "uteplenie", calculatorCategorySlug: "fasad", calculatorTitle: "Калькулятор утеплителя" },
  krovlya: { calculatorSlug: "krovlya", calculatorCategorySlug: "krovlya", calculatorTitle: "Калькулятор материалов кровли" },
  "myagkaya-krovlya": { calculatorSlug: "myagkaya-krovlya", calculatorCategorySlug: "krovlya", calculatorTitle: "Калькулятор мягкой кровли" },
  "natyazhnoj-potolok": { calculatorSlug: "natyazhnoj-potolok", calculatorCategorySlug: "potolki", calculatorTitle: "Калькулятор натяжного потолка" },
  "podvesnoy-potolok-gkl": { calculatorSlug: "podvesnoy-potolok-gkl", calculatorCategorySlug: "potolki", calculatorTitle: "Калькулятор потолка КНАУФ П 113" },
  "reechnyj-potolok": { calculatorSlug: "reechnyj-potolok", calculatorCategorySlug: "potolki", calculatorTitle: "Калькулятор реечного потолка" },
  "kassetnyi-potolok": { calculatorSlug: "kassetnyi-potolok", calculatorCategorySlug: "potolki", calculatorTitle: "Калькулятор кассетного потолка" },
} as const satisfies Record<string, MaterialComparisonCalculatorLink>;

const MATERIAL_CALCULATOR_KEYS: Readonly<Record<string, keyof typeof CALCULATOR_LINKS>> = {
  "Ламинат 32 класс": "laminat",
  "Ламинат 33-34 класс": "laminat",
  "Линолеум бытовой": "linoleum",
  "Линолеум полукоммерческий": "linoleum",
  Керамогранит: "plitka",
  "Паркетная доска": "parket",
  "Плитка керамическая": "plitka",
  "Обои виниловые": "oboi",
  "Обои флизелиновые под покраску": "oboi",
  "Краска интерьерная": "kraska",
  "Декоративная штукатурка": "dekorativnaya-shtukaturka",
  "Керамическая плитка": "plitka",
  "Пластиковые стеновые панели (ПВХ)": "paneli-dlya-sten",
  "Минвата (Rockwool, Технониколь)": "uteplenie",
  "Обычный пенополистирол (пенопласт)": "uteplenie",
  "Экструдированный пенополистирол (ЭППС)": "uteplenie",
  Эковата: "uteplenie",
  Металлочерепица: "krovlya",
  "Профнастил С21/НС35": "krovlya",
  "Мягкая кровля (гибкая черепица)": "myagkaya-krovlya",
  Ондулин: "krovlya",
  "Натяжной потолок из пластиковой плёнки (ПВХ)": "natyazhnoj-potolok",
  "Натяжной (тканевый)": "natyazhnoj-potolok",
  "Гипсокартон (ГКЛ)": "podvesnoy-potolok-gkl",
  "Покраска (по шпаклёвке)": "kraska",
  "Реечный потолок (алюминий)": "reechnyj-potolok",
  "Кассетный потолок (Armstrong)": "kassetnyi-potolok",
};

const CALCULATOR_COMPARISON_CATEGORIES: Readonly<Record<string, MaterialComparisonCategoryId>> = {
  laminat: "flooring",
  linoleum: "flooring",
  parket: "flooring",
  oboi: "walls",
  "paneli-dlya-sten": "walls",
  uteplenie: "insulation",
  krovlya: "roofing",
  "myagkaya-krovlya": "roofing",
  "natyazhnoj-potolok": "ceilings",
  "podvesnoy-potolok-gkl": "ceilings",
  "reechnyj-potolok": "ceilings",
  "kassetnyi-potolok": "ceilings",
};

export function isMaterialComparisonCategoryId(
  value: string | null,
): value is MaterialComparisonCategoryId {
  return value !== null
    && MATERIAL_COMPARISON_CATEGORY_IDS.includes(value as MaterialComparisonCategoryId);
}

export function buildMaterialComparisonHrefFromCalculator(
  calculatorSlug: string,
): string | null {
  const categoryId = CALCULATOR_COMPARISON_CATEGORIES[calculatorSlug];
  if (!categoryId) return null;

  const params = new URLSearchParams({ category: categoryId, from: calculatorSlug });
  return `/instrumenty/${MATERIAL_COMPARISON_TOOL_SLUG}/?${params.toString()}`;
}

export interface MaterialComparisonTransfer {
  categoryId: MaterialComparisonCategoryId;
  sourceCalculatorSlug: string;
}

export function readMaterialComparisonTransfer(
  searchParams: Pick<URLSearchParams, "get">,
): MaterialComparisonTransfer | null {
  const categoryId = searchParams.get("category");
  const sourceCalculatorSlug = searchParams.get("from");
  if (!isMaterialComparisonCategoryId(categoryId) || !sourceCalculatorSlug) return null;
  if (CALCULATOR_COMPARISON_CATEGORIES[sourceCalculatorSlug] !== categoryId) return null;
  return { categoryId, sourceCalculatorSlug };
}

export function getCalculatorLinkForComparedMaterial(
  materialName: string,
): MaterialComparisonCalculatorLink | null {
  const calculatorKey = MATERIAL_CALCULATOR_KEYS[materialName];
  return calculatorKey ? CALCULATOR_LINKS[calculatorKey] : null;
}

export function buildCalculatorHrefForComparedMaterial(materialName: string): string | null {
  const link = getCalculatorLinkForComparedMaterial(materialName);
  return link
    ? getCanonicalCalculatorPath({
        categorySlug: link.calculatorCategorySlug,
        slug: link.calculatorSlug,
      })
    : null;
}

export const LINKED_COMPARISON_MATERIAL_NAMES = Object.freeze(
  Object.keys(MATERIAL_CALCULATOR_KEYS),
);
