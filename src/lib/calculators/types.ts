// Типы для калькуляторов

export type FieldType = "number" | "slider" | "select" | "switch" | "radio";

export interface FieldOption {
  value: number;
  label: string;
  /** Группа в `<optgroup>` для select */
  optGroup?: string;
}

export interface CalculatorField {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
  options?: FieldOption[];
  hint?: string;
  group?: string;
  /**
   * Условие скрытия поля. Декларация (не функция!) чтобы Next.js мог
   * сериализовать спецификацию полей между Server → Client Components.
   * Функции через границу не передаются, поэтому условие описывается данными.
   *
   * Используется, например, чтобы скрыть «Тип утеплителя», «Размер плиты»,
   * «Плит в упаковке» когда выбран конкретный производитель — все эти параметры
   * уже зашиты в линейке бренда и подставляются автоматически.
   *
   * Поддерживаемые операторы:
   *  - "gt"  — значение поля > value
   *  - "gte" — значение ≥ value
   *  - "lt"  — значение < value
   *  - "lte" — значение ≤ value
   *  - "eq"  — значение === value
   *  - "ne"  — значение !== value
   *
   * Несколько правил соединяются логическим OR (поле скрывается если хотя бы
   * одно условие выполнено). Для AND-логики используй `hideIfAll`.
   */
  hideIf?: HideCondition | HideCondition[];
  /** Как hideIf, но условия объединяются через AND (все должны выполниться). */
  hideIfAll?: HideCondition[];
  /**
   * Динамические опции, зависящие от выбранного производителя.
   *
   * Когда пользователь выбирает конкретную линейку бренда (поле `manufacturer`),
   * опции этого поля **переопределяются** значениями из specs бренда. Например,
   * у «Пеноплэкс Комфорт» в `specs.thicknessOptions` лежит [20, 30, 50, 100] —
   * пользователь увидит ровно эти 4 толщины вместо стандартных 50/80/100/150/200.
   *
   * Это решает проблему: «у бренда нет 80 мм, но пользователь его выбирает в
   * селекте». Делаем UI **физически** соответствующим линейке.
   *
   * Если бренд не выбран (manufacturer = 0) — используются статичные `options`.
   * Если бренд выбран, но в specs нет нужного ключа — используются `options`.
   */
  optionsFromBrand?: {
    /** Категория брендов из manufacturers.json (например "insulation"). */
    category: string;
    /** Ключ внутри `manufacturer.specs` где лежит массив чисел. */
    specKey: string;
    /**
     * Шаблон для лейбла опции. `%v` подставляется на значение.
     * Если не задан — используется `${value}` как есть.
     */
    labelTemplate?: string;
  };
  /** Толщины из каталога утеплителя (`productId` → insulation-catalog). */
  optionsFromProduct?: boolean;
}

export interface HideCondition {
  key: string;
  op: "gt" | "gte" | "lt" | "lte" | "eq" | "ne";
  value: number;
}

export type CategoryId =
  | "foundation"
  | "walls"
  | "flooring"
  | "roofing"
  | "facade"
  | "engineering"
  | "interior"
  | "ceiling";

export interface Category {
  id: CategoryId;
  label: string;
  slug: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export interface CalculatorMeta {
  id: string;
  slug: string;         // URL slug для /kalkulyatory/[cat]/[slug]/
  title: string;        // название
  h1: string;           // SEO H1
  description: string;  // краткое описание
  metaTitle: string;    // <title>
  metaDescription: string; // <meta description>
  category: CategoryId;
  categorySlug: string;
  tags: string[];
  popularity: number;
  complexity: 1 | 2 | 3;
}

export interface MaterialResult {
  name: string;
  quantity: number;
  unit: string;
  withReserve?: number;
  purchaseQty?: number;
  category?: string;
  packageInfo?: { count: number; size: number; packageUnit: string };
}


export type ScenarioName = "MIN" | "REC" | "MAX";

export interface CalculatorScenario {
  exact_need: number;
  purchase_quantity: number;
  leftover: number;
  assumptions: string[];
  key_factors: Record<string, number>;
  buy_plan: {
    package_label: string;
    package_size: number;
    packages_count: number;
    unit: string;
  };
}

export type CalculatorScenarios = Record<ScenarioName, CalculatorScenario>;
/**
 * Кастомная карточка в шапке результата.
 *
 * Если калькулятор возвращает `summaryCards` (3 шт.) — они показываются вместо
 * стандартного набора «Всего материалов / Площадь / Ключевой параметр».
 * Это нужно когда стандартные totals неинформативны для пользователя —
 * например в утеплителе важнее «купить N упаковок» чем «всего 7 позиций».
 *
 * Формат не привязан к движку: можно показать стоимость, число упаковок,
 * рекомендацию по бренду — всё что собрала формула в `calculate()`.
 */
export interface SummaryCard {
  icon: string;
  /** Маленькая подпись сверху (например «К покупке») */
  label: string;
  /** Главное значение (число или короткая строка) */
  value: string;
  /** Единица или короткое уточнение справа от value */
  unit?: string;
  /** Дополнительная строка снизу (например «Технониколь Роклайт») */
  hint?: string;
  /** Цветовая палитра карточки */
  tone?: "violet" | "emerald" | "slate" | "amber";
}

export interface CalculatorResult {
  materials: MaterialResult[];
  totals: Record<string, number>;
  warnings: string[];
  scenarios?: CalculatorScenarios;
  formulaVersion?: string;
  canonicalSpecId?: string;
  practicalNotes?: string[];
  accuracyMode?: import("../../../engine/accuracy").AccuracyMode;
  accuracyExplanation?: import("../../../engine/accuracy").AccuracyExplanation;
  /** Кастомные карточки в шапке результата (если есть — заменяют стандартные). */
  summaryCards?: SummaryCard[];
}

export type CalculateFn = (inputs: Record<string, number>) => CalculatorResult;

export interface CalculatorDefinition extends CalculatorMeta {
  fields: CalculatorField[];
  calculate: CalculateFn;
  formulaVersion?: string;
  formulaDescription?: string;
  howToUse?: string[];
  expertTips?: {
    title: string;
    content: string;
    author?: string;
  }[];
  faq?: {
    question: string;
    answer: string;
  }[];
  /** SEO/GEO/AEO-контент: экспертное описание (HTML) + расширенный FAQ (HTML-ответы) */
  seoContent?: {
    descriptionHtml: string;
    faq: { question: string; answer: string }[];
  };
}


