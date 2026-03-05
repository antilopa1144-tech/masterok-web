export type ScenarioName = "MIN" | "REC" | "MAX";

export const SCENARIOS: ScenarioName[] = ["MIN", "REC", "MAX"];

export interface BuyPlan {
  package_label: string;
  package_size: number;
  packages_count: number;
  unit: string;
}

export interface ScenarioOutput {
  exact_need: number;
  purchase_quantity: number;
  leftover: number;
  assumptions: string[];
  key_factors: Record<string, number>;
  buy_plan: BuyPlan;
}

export type ScenarioBundle = Record<ScenarioName, ScenarioOutput>;
