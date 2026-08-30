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
export type ImplementationAuditStatus = "pending" | "completed";

export interface CalculatorRiskEntry {
  slug: string;
  canonicalId: string;
  tier: CalculationRiskTier;
  drivers: CalculationRiskDriver[];
  implementationAudit: ImplementationAuditStatus;
  auditEvidence: string[];
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
  implementationAudit: "pending",
  auditEvidence: [],
  independentReview: "pending",
});

const implementationAudited = (
  slug: string,
  canonicalId: string,
  tier: CalculationRiskTier,
  drivers: CalculationRiskDriver[],
  auditEvidence: string[],
): CalculatorRiskEntry => ({
  slug,
  canonicalId,
  tier,
  drivers,
  implementationAudit: "completed",
  auditEvidence,
  independentReview: "pending",
});

export const CALCULATOR_RISK_REGISTRY: CalculatorRiskEntry[] = [
  // P0: ошибка способна повлиять на конструктив или безопасность инженерной системы.
  implementationAudited(
    "beton",
    "concrete",
    "P0",
    ["structural_safety", "large_purchase", "field_factors"],
    [
      "canonical concrete-canonical-v3",
      "официальные карточки ГОСТ 27006-2019, ГОСТ 7473-2010, ГОСТ 26633-2015 и СП 70.13330.2012",
      "отказ от расчёта арматуры и опалубки по одному объёму бетона",
      "регрессии геометрии, запаса, шага заказа, ручного состава и округления заполнителей",
      "web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "lentochnyy-fundament",
    "strip-foundation",
    "P0",
    ["structural_safety", "large_purchase", "complex_geometry"],
    [
      "canonical strip-foundation-canonical-v3",
      "официальные карточки СП 22.13330.2016, СП 63.13330.2018, ГОСТ 7473-2010 и СП 70.13330.2012",
      "явные геометрия, запас бетона, шаг заказа, остаток в линии подачи и проектные параметры арматуры",
      "покупка арматуры целыми прутками без выдуманного расчёта ФБС, подушки, гидроизоляции и утепления",
      "web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "plitnyj-fundament",
    "foundation-slab",
    "P0",
    ["structural_safety", "large_purchase", "multi_material"],
    [
      "canonical foundation-slab-canonical-v3",
      "официальные карточки СП 22.13330.2016, СП 63.13330.2018, ГОСТ 7473-2010 и ГОСТ 34028-2016",
      "отказ от квадратной аппроксимации по одной площади и скрытых полевых коэффициентов",
      "явные размеры, проектная сетка, запасы, длина прутка, фасовки и надбавки к заказу уплотняемых слоёв",
      "целые прутки, упаковки проволоки, рулоны геотекстиля и плиты ЭППС; web/mobile parity и общий Flutter flow",
    ],
  ),
  implementationAudited(
    "podval-fundamenta",
    "basement",
    "P0",
    ["structural_safety", "moisture_risk", "multi_material"],
    [
      "canonical basement-canonical-v2",
      "официальные карточки СП 22.13330.2016, СП 63.13330.2018, СП 28.13330.2017, СП 71.13330.2017, ГОСТ 7473-2010/2026 и ГОСТ 34028-2016",
      "стены считаются как наружный контур минус внутренний без двойного счёта углов; плита пола и обе заливки заданы отдельно",
      "арматура принимается только из проектной ведомости, а опалубка, гидроизоляция и утепление — только по выбранным поверхностям и данным фактического товара",
      "удалены автоматические продухи, дренаж и универсальные нормы материалов; web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "armatura",
    "rebar",
    "P0",
    ["structural_safety", "large_purchase", "packaging"],
    [
      "canonical rebar-canonical-v2",
      "официальные карточки ГОСТ 34028-2016, ГОСТ 5781-82 и СП 63.13330.2018",
      "явные проектные схемы сетки и продольного каркаса, геометрия, диаметры, шаги, запас, длина прутка и параметры вязальной проволоки",
      "каждый диаметр отдельно округляется до целых прутков без автоматического назначения армирования, нахлёстов, анкеровки и фиксаторов",
      "web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "karkasnyj-dom",
    "frame-house",
    "P0",
    ["structural_safety", "building_physics", "multi_material"],
    [
      "canonical frame-house-canonical-v2",
      "официальные карточки СП 64.13330.2017, СП 20.13330.2016, СП 50.13330.2024, ГОСТ Р 70876-2023, ГОСТ Р 57031-2016 и ГОСТ 32567-2013",
      "закупочная оценка только по проектной ведомости без автоматического назначения стоек, обвязок, утепления, крепежа, несущей схемы и теплотехнических параметров",
      "явные проектные количества, площадь брутто или нетто и фактические длины досок, размеры листов, рулонов, упаковок и крепежа; MIN/REC/MAX применяется только к наружной обшивке",
      "web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "podvesnoy-potolok-gkl",
    "drywall-ceiling",
    "P0",
    ["structural_safety", "complex_geometry", "multi_material"],
    [
      "canonical drywall-ceiling-canonical-v3",
      "официальные карточки СП 163.1325800.2014 с изменением 1, ГОСТ 32614-2012 и комплектной системы КНАУФ П 113",
      "расходы разделены для П 113.1 и П 113.2 и привязаны к официальной ведомости на 100 м² без потерь на раскрой",
      "фактический периметр вводится явно; удалены условный квадрат и скрытый MAX-запас",
      "плиты, ПП, ПН, ленты, соединители, удлинители, подвесы, анкеры, LN/TN, шпаклёвка и грунтовка округляются отдельными закупочными позициями; web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "krovlya",
    "roofing",
    "P0",
    ["structural_safety", "moisture_risk", "large_purchase"],
    [
      "canonical roofing-canonical-v3",
      "официальные карточки СП 17.13330.2017 с изменениями 1–5, СП 20.13330.2016, СП 64.13330.2017, ГОСТ 24045-2016, ГОСТ 30340-2012, ГОСТ 32806-2014 и ГОСТ Р 58153-2018",
      "точная суммарная площадь скатов принимается из проекта; пересчёт горизонтальной проекции по углу оставлен только для простой одно- или двускатной крыши с одинаковым уклоном",
      "основное покрытие округляется по фактической полезной площади товара, а конёк, ендовы, карниз, мембрана, основание, обрешётка, контробрешётка, крепёж, снегозадержатели и лента — только по проектной ведомости и реальным фасовкам",
      "удалены квадратная аппроксимация периметра, скрытый коэффициент сложности и автоматическое назначение элементов кровельной системы; web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "kalkulyator-lestnicy",
    "stairs",
    "P0",
    ["structural_safety", "complex_geometry"],
    [
      "canonical stairs-canonical-v2",
      "официальные карточки СП 55.13330.2016, СП 1.13130.2020, СП 64.13330.2017, СП 16.13330.2017, СП 63.13330.2018 и ГОСТ 25772-2025",
      "геометрия ограничена одним прямым маршем, число подъёмов определяется по целевой высоте либо принимается из проекта, а результат отдельно показывает подъёмы, проступи, длину марша, угол, формулу шага и приближённый габарит прохода",
      "калькулятор не назначает несущую схему, косоуры, армирование, площадки, ограждения или крепёж",
      "закупка появляется только из явной проектной ведомости и фактических фасовок, MIN/REC/MAX применяется только к заготовкам ступеней без скрытого запаса; web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "elektrika",
    "electric",
    "P0",
    ["engineering_safety", "large_purchase", "multi_material"],
    [
      "canonical electric-canonical-v3",
      "официальные карточки СП 256.1325800.2016, ГОСТ Р 50571.4.41-2022 и ГОСТ 31565-2012",
      "регрессии покупки по метрам/бухтам и выбора фазности",
      "web/mobile parity и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "otoplenie-radiatory",
    "heating",
    "P0",
    ["engineering_safety", "building_physics", "field_factors"],
    [
      "canonical heating-canonical-v4",
      "официальные карточки СП 60.13330.2020 с изменениями 1–6, СП 50.13330.2024, СП 131.13330.2025, ГОСТ 31311-2022 и ГОСТ Р 53583-2009",
      "точный режим принимает готовую тепловую нагрузку одного помещения или независимо рассчитанной зоны, а режим Вт/м² оставлен только как явная предварительная сметная оценка",
      "теплоотдача принимается из паспорта для рабочего режима либо пересчитывается по фактическому температурному напору и показателю n изготовителя без климатических ярлыков и скрытого запаса",
      "число секций или приборов округляется вверх, а трубы, фитинги, кронштейны и арматура появляются только из проектной ведомости; web/mobile parity, CalculatorEngine и фактический desktop/mobile ProCalculator flow",
    ],
  ),
  implementationAudited(
    "ventilyaciya",
    "ventilation",
    "P0",
    ["engineering_safety", "building_physics", "field_factors"],
    [
      "canonical ventilation-canonical-v2",
      "официальные карточки СП 60.13330.2020 с изменениями 1–6, СП 54.13330.2022 и ГОСТ Р 70824-2023",
      "жилой режим ограничен предварительной оценкой минимального расхода наружного воздуха, проектный режим принимает готовый расход без имитации проектирования системы",
      "сечение проверяется по фактической средней скорости и явно заданной целевой скорости без расчёта потерь давления, местных сопротивлений, шума и рабочей точки вентилятора",
      "закупка воздуховодов и штучных элементов появляется только из проектной ведомости и реальных длин отрезков; web/mobile parity, CalculatorEngine и фактический Flutter ProCalculator flow",
    ],
  ),
  implementationAudited(
    "teplyy-pol",
    "warm-floor",
    "P0",
    ["engineering_safety", "large_purchase", "field_factors"],
    [
      "canonical warm-floor-canonical-v3",
      "официальные карточки ГОСТ Р 50571-7-753-2013, СП 256.1325800.2016 с изменениями 1–9, ГОСТ IEC 60335-2-96-2012 и ГОСТ 29322-2014",
      "электрический калькулятор проверяет выбранные заводские маты или кабельные комплекты по фактической раскладке, паспортной мощности, напряжению и току без назначения универсальных Вт/м²",
      "MIN/REC/MAX совпадают: длина нагревательного кабеля и число комплектов не получают скрытый запас; терморегулятор, датчик и трубка появляются только из явной ведомости",
      "водяной режим перенесён в отдельный калькулятор; web/mobile parity, CalculatorEngine, приоритетные карточки результата и фактический desktop/mobile ProCalculator flow",
    ],
  ),
  implementationAudited(
    "vodyanoy-teplyy-pol",
    "warm-floor-pipes",
    "P0",
    ["engineering_safety", "moisture_risk", "complex_geometry"],
    [
      "canonical warm-floor-pipes-canonical-v2",
      "официальные карточки СП 60.13330.2020 с изменениями 1–6, СП 29.13330.2011 с изменениями 1–4 и ГОСТ 32415-2013",
      "предварительная геометрия использует только фактическую площадь раскладки, проектный шаг и явно введённые подводки; проектный режим принимает готовую сумму длин контуров",
      "удалены скрытый вычет 15% на мебель, универсальные 80 м на петлю, запас 5%, условная бухта 200 м и автоматическое назначение ЭППС, ленты, крепежа, коллектора и стяжки",
      "MIN/REC/MAX совпадают; округление по фактической бухте предупреждает, что общая длина не заменяет план раскроя непрерывных петель",
      "web/mobile parity, CalculatorEngine, отдельный пункт каталога и фактический desktop/mobile ProCalculator flow",
    ],
  ),
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
