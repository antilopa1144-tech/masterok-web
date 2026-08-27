/**
 * Приоритет предметного аудита опубликованных калькуляторов.
 *
 * Важно: tier описывает потенциальный ущерб ошибки и порядок проверки, а не
 * утверждает, что в формуле уже найден баг. Наличие canonical/parity/tests
 * проверяется отдельно и не заменяет независимое инженерное ревью.
 */

export type CalculationRiskTier = "P0" | "P1" | "P2";

export type CalculationRiskDriver =
  | "structural_safety"
  | "engineering_safety"
  | "moisture_risk"
  | "building_physics"
  | "large_purchase"
  | "complex_geometry"
  | "multi_material"
  | "field_factors"
  | "packaging";

export type IndependentReviewStatus = "pending" | "partial" | "verified";

export interface CalculatorRiskEntry {
  slug: string;
  canonicalId: string;
  tier: CalculationRiskTier;
  drivers: CalculationRiskDriver[];
  independentReview: IndependentReviewStatus;
}

export const CALCULATION_RISK_DRIVER_LABELS: Record<CalculationRiskDriver, string> = {
  structural_safety: "конструктивная безопасность",
  engineering_safety: "безопасность инженерной системы",
  moisture_risk: "риск протечки и увлажнения",
  building_physics: "теплотехника и строительная физика",
  large_purchase: "крупная закупка",
  complex_geometry: "сложная геометрия",
  multi_material: "много связанных материалов",
  field_factors: "полевые коэффициенты",
  packaging: "округление до покупаемых упаковок",
};

const pending = (
  slug: string,
  canonicalId: string,
  tier: CalculationRiskTier,
  drivers: CalculationRiskDriver[],
): CalculatorRiskEntry => ({
  slug,
  canonicalId,
  tier,
  drivers,
  independentReview: "pending",
});

export const CALCULATOR_RISK_REGISTRY: CalculatorRiskEntry[] = [
  // P0: ошибка способна повлиять на конструктив или безопасность инженерной системы.
  pending("beton", "concrete", "P0", ["structural_safety", "large_purchase", "field_factors"]),
  pending("lentochnyy-fundament", "strip-foundation", "P0", ["structural_safety", "large_purchase", "complex_geometry"]),
  pending("plitnyj-fundament", "foundation-slab", "P0", ["structural_safety", "large_purchase", "multi_material"]),
  pending("podval-fundamenta", "basement", "P0", ["structural_safety", "moisture_risk", "multi_material"]),
  pending("armatura", "rebar", "P0", ["structural_safety", "large_purchase", "packaging"]),
  pending("karkasnyj-dom", "frame-house", "P0", ["structural_safety", "building_physics", "multi_material"]),
  pending("podvesnoy-potolok-gkl", "drywall-ceiling", "P0", ["structural_safety", "complex_geometry", "multi_material"]),
  pending("krovlya", "roofing", "P0", ["structural_safety", "moisture_risk", "large_purchase"]),
  pending("kalkulyator-lestnicy", "stairs", "P0", ["structural_safety", "complex_geometry"]),
  pending("elektrika", "electric", "P0", ["engineering_safety", "large_purchase", "multi_material"]),
  pending("otoplenie-radiatory", "heating", "P0", ["engineering_safety", "building_physics", "field_factors"]),
  pending("ventilyaciya", "ventilation", "P0", ["engineering_safety", "building_physics", "field_factors"]),
  pending("teplyy-pol", "warm-floor", "P0", ["engineering_safety", "large_purchase", "field_factors"]),
  pending("vodyanoy-teplyy-pol", "warm-floor-pipes", "P0", ["engineering_safety", "moisture_risk", "complex_geometry"]),
  pending("septik", "sewage", "P0", ["engineering_safety", "field_factors", "large_purchase"]),
  pending("septik-iz-kolets", "septic-rings", "P0", ["engineering_safety", "structural_safety", "packaging"]),
  pending("teplitsa-iz-polikarbonata", "greenhouse", "P0", ["structural_safety", "complex_geometry", "multi_material"]),

  // P1: дорогая закупка, ограждающая конструкция или высокий риск переделки.
  pending("otmostka", "blind-area", "P1", ["moisture_risk", "large_purchase", "multi_material"]),
  pending("kirpich", "brick", "P1", ["large_purchase", "complex_geometry", "packaging"]),
  pending("gipsokarton", "drywall", "P1", ["large_purchase", "complex_geometry", "multi_material"]),
  pending("gazobeton", "aerated-concrete", "P1", ["large_purchase", "complex_geometry", "packaging"]),
  pending("penobloki", "foam-blocks", "P1", ["large_purchase", "complex_geometry", "packaging"]),
  pending("kladka-kirpicha", "brickwork", "P1", ["large_purchase", "field_factors", "multi_material"]),
  pending("peregorodki-iz-blokov", "partitions", "P1", ["large_purchase", "complex_geometry", "multi_material"]),
  pending("plitka", "tile", "P1", ["large_purchase", "complex_geometry", "packaging"]),
  pending("laminat", "laminate", "P1", ["large_purchase", "complex_geometry", "packaging"]),
  pending("linoleum", "linoleum", "P1", ["large_purchase", "complex_geometry", "field_factors"]),
  pending("styazhka", "screed", "P1", ["large_purchase", "field_factors", "packaging"]),
  pending("vodostok", "gutters", "P1", ["moisture_risk", "complex_geometry", "multi_material"]),
  pending("myagkaya-krovlya", "soft-roofing", "P1", ["moisture_risk", "large_purchase", "packaging"]),
  pending("uteplenie", "insulation", "P1", ["building_physics", "large_purchase", "packaging"]),
  pending("uteplenie-potolka", "ceiling-insulation", "P1", ["building_physics", "moisture_risk", "packaging"]),
  pending("uteplenie-fasada-minvatoj", "facade-insulation", "P1", ["building_physics", "moisture_risk", "multi_material"]),
  pending("sayding", "siding", "P1", ["large_purchase", "complex_geometry", "multi_material"]),
  pending("fasadnye-paneli", "facade-panels", "P1", ["large_purchase", "complex_geometry", "multi_material"]),
  pending("oblitsovochnyj-kirpich", "facade-brick", "P1", ["moisture_risk", "large_purchase", "multi_material"]),
  pending("zabor", "fence", "P1", ["large_purchase", "complex_geometry", "multi_material"]),
  pending("kalkulyator-terrasnoy-doski", "terrace", "P1", ["moisture_risk", "large_purchase", "complex_geometry"]),
  pending("trotuarnaya-plitka", "paving-tiles", "P1", ["large_purchase", "field_factors", "packaging"]),
  pending("drenazh-uchastka", "drainage", "P1", ["moisture_risk", "field_factors", "large_purchase"]),
  pending("gidroizolyaciya-vlagozaschita", "waterproofing", "P1", ["moisture_risk", "field_factors", "packaging"]),
  pending("ustanovka-okon", "windows", "P1", ["building_physics", "moisture_risk", "multi_material"]),
  pending("zvukoizolyaciya", "sound-insulation", "P1", ["building_physics", "large_purchase", "multi_material"]),
  pending("otdelka-mansardy", "attic", "P1", ["building_physics", "complex_geometry", "multi_material"]),
  pending("vannaya-komnata", "bathroom", "P1", ["moisture_risk", "large_purchase", "multi_material"]),

  // P2: стандартная оценка материалов; обязательны те же четыре слоя аудита.
  pending("shtukaturka", "plaster", "P2", ["field_factors", "packaging"]),
  pending("paneli-dlya-sten", "wall-panels", "P2", ["complex_geometry", "packaging"]),
  pending("zatirka", "tile-grout", "P2", ["field_factors", "packaging"]),
  pending("klej-dlya-plitki", "tile-adhesive", "P2", ["field_factors", "packaging"]),
  pending("parket", "parquet", "P2", ["complex_geometry", "packaging"]),
  pending("nalivnoy-pol", "self-leveling", "P2", ["field_factors", "packaging"]),
  pending("natyazhnoj-potolok", "ceiling-stretch", "P2", ["complex_geometry", "packaging"]),
  pending("reechnyj-potolok", "ceiling-rail", "P2", ["complex_geometry", "packaging"]),
  pending("kassetnyi-potolok", "ceiling-cassette", "P2", ["complex_geometry", "packaging"]),
  pending("dekorativnaya-shtukaturka", "decor-plaster", "P2", ["field_factors", "packaging"]),
  pending("dekorativnyj-kamen", "decor-stone", "P2", ["complex_geometry", "packaging"]),
  pending("gazon", "lawn", "P2", ["field_factors", "packaging"]),
  pending("oboi", "wallpaper", "P2", ["complex_geometry", "packaging"]),
  pending("kraska", "paint", "P2", ["field_factors", "packaging"]),
  pending("gruntovka", "primer", "P2", ["field_factors", "packaging"]),
  pending("shpaklevka", "putty", "P2", ["field_factors", "packaging"]),
  pending("ustanovka-dverej", "doors", "P2", ["multi_material", "packaging"]),
  pending("otkosy-okon-i-dverej", "slopes", "P2", ["complex_geometry", "multi_material"]),
  pending("otdelka-balkona", "balcony", "P2", ["complex_geometry", "multi_material"]),
  pending("krepezh", "fasteners", "P2", ["field_factors", "packaging"]),
];

export const getCalculatorRisk = (slug: string): CalculatorRiskEntry | undefined =>
  CALCULATOR_RISK_REGISTRY.find((entry) => entry.slug === slug);
