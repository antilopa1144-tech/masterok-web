// Типы для калькуляторов

export type FieldType = "number" | "slider" | "select" | "switch" | "radio";

export interface FieldOption {
  value: number;
  label: string;
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
export interface CalculatorResult {
  materials: MaterialResult[];
  totals: Record<string, number>;
  warnings: string[];
  scenarios?: CalculatorScenarios;
  formulaVersion?: string;
  canonicalSpecId?: string;
  practicalNotes?: string[];
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
}


