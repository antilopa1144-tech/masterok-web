#!/usr/bin/env npx tsx

import * as fs from "node:fs";
import * as path from "node:path";
import { ALL_CALCULATORS } from "../src/lib/calculators";
import {
  CALCULATION_RISK_DRIVER_LABELS,
  CALCULATOR_RISK_REGISTRY,
  type CalculatorRiskEntry,
  type CalculationRiskTier,
} from "../src/lib/calculators/risk-registry";

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "docs", "calculator-risk-register.md");

interface StructuralEvidence {
  canonical: boolean;
  engine: boolean;
  parity: boolean;
  scenarioPolicy: boolean;
  packagingRules: boolean;
  dedicatedTest: boolean;
  parityCases: number;
}

const exists = (...parts: string[]): boolean => fs.existsSync(path.join(ROOT, ...parts));

function readStructuralEvidence(entry: CalculatorRiskEntry): StructuralEvidence {
  const canonicalPath = path.join(
    ROOT,
    "configs",
    "calculators",
    `${entry.canonicalId}-canonical.v1.json`,
  );
  const parityPath = path.join(
    ROOT,
    "tests",
    "fixtures",
    "parity",
    `${entry.canonicalId}.parity.json`,
  );
  const canonical = fs.existsSync(canonicalPath);
  const parity = fs.existsSync(parityPath);
  const spec = canonical ? JSON.parse(fs.readFileSync(canonicalPath, "utf8")) : {};
  const fixture = parity ? JSON.parse(fs.readFileSync(parityPath, "utf8")) : {};

  return {
    canonical,
    engine: exists("engine", `${entry.canonicalId}.ts`),
    parity,
    scenarioPolicy: Boolean(spec.scenario_policy && typeof spec.scenario_policy === "object"),
    packagingRules: Boolean(spec.packaging_rules && typeof spec.packaging_rules === "object"),
    dedicatedTest:
      exists("src", "lib", "calculators", "__tests__", `${entry.canonicalId}.test.ts`) ||
      exists("tests", "engine", `${entry.canonicalId}.test.ts`),
    parityCases: Array.isArray(fixture.cases) ? fixture.cases.length : 0,
  };
}

const mark = (value: boolean): string => (value ? "да" : "нет");

const reviewLabel: Record<CalculatorRiskEntry["independentReview"], string> = {
  pending: "ожидает",
  partial: "частично",
  verified: "подтверждено",
};

const tierOrder: Record<CalculationRiskTier, number> = { P0: 0, P1: 1, P2: 2 };

const rows = CALCULATOR_RISK_REGISTRY.map((entry) => {
  const calculator = ALL_CALCULATORS.find((item) => item.slug === entry.slug);
  if (!calculator) throw new Error(`Unknown published calculator: ${entry.slug}`);
  return { entry, calculator, evidence: readStructuralEvidence(entry) };
}).sort(
  (left, right) =>
    tierOrder[left.entry.tier] - tierOrder[right.entry.tier] ||
    left.calculator.title.localeCompare(right.calculator.title, "ru"),
);

const tierCounts = rows.reduce<Record<CalculationRiskTier, number>>(
  (acc, row) => {
    acc[row.entry.tier] += 1;
    return acc;
  },
  { P0: 0, P1: 0, P2: 0 },
);

const structurallyReady = rows.filter(({ evidence }) =>
  evidence.canonical &&
  evidence.engine &&
  evidence.parity &&
  evidence.scenarioPolicy &&
  evidence.packagingRules &&
  evidence.dedicatedTest,
).length;
const independentlyVerified = rows.filter(
  ({ entry }) => entry.independentReview === "verified",
).length;
const implementationAudited = rows.filter(
  ({ entry }) => entry.implementationAudit === "completed",
).length;
const parityCases = rows.reduce((sum, row) => sum + row.evidence.parityCases, 0);

const tableRows = rows.map(({ entry, calculator, evidence }) => {
  const drivers = entry.drivers.map((driver) => CALCULATION_RISK_DRIVER_LABELS[driver]).join(", ");
  const auditEvidence = entry.auditEvidence.length > 0
    ? entry.auditEvidence.join("; ")
    : "—";
  return `| ${entry.tier} | ${calculator.title} | \`${entry.slug}\` | \`${entry.canonicalId}\` | ${drivers} | ${mark(evidence.canonical && evidence.engine)} | ${mark(evidence.scenarioPolicy)} | ${mark(evidence.packagingRules)} | ${evidence.parityCases} | ${mark(evidence.dedicatedTest)} | ${entry.implementationAudit === "completed" ? "завершён" : "ожидает"} | ${auditEvidence} | ${reviewLabel[entry.independentReview]} |`;
});

const content = `# Реестр расчётных рисков «Мастерка»

> AUTO-GENERATED — не править вручную. Источники: опубликованный каталог,
> \`src/lib/calculators/risk-registry.ts\`, canonical-спеки, engine, parity и тесты.
> Обновление: \`npm run audit:risk\`.

## Как читать реестр

- **P0** — потенциальное влияние на конструктивную или инженерную безопасность.
- **P1** — крупная закупка, ограждающая конструкция, вода/теплотехника или дорогая переделка.
- **P2** — стандартный материальный расчёт; требования к математике, полевым поправкам и упаковке не снижаются.
- Автоматические колонки подтверждают наличие контракта и тестового каркаса, но не достоверность коэффициентов.
- «Независимое ревью» становится «подтверждено» только после предметной проверки формулы, единиц, MIN/REC/MAX, упаковки, границ и пользовательского результата с зафиксированным доказательством.

## Сводка

| Метрика | Значение |
|---|---:|
| Опубликованные калькуляторы в реестре | ${rows.length}/${ALL_CALCULATORS.length} |
| Полный структурный каркас | ${structurallyReady}/${rows.length} |
| Parity-сценарии | ${parityCases} |
| P0 / P1 / P2 | ${tierCounts.P0} / ${tierCounts.P1} / ${tierCounts.P2} |
| Implementation-аудит завершён | ${implementationAudited}/${rows.length} |
| Независимое предметное ревью подтверждено | ${independentlyVerified}/${rows.length} |

«Полный структурный каркас» означает: canonical JSON, engine, scenario policy,
packaging rules, parity fixture и отдельный calculator/engine test существуют.
Это входной контроль, а не оценка корректности 9,5/10.

## Очередь аудита

| Tier | Калькулятор | Slug | Canonical | Драйверы риска | Spec + engine | MIN/REC/MAX policy | Packaging contract | Parity cases | Dedicated test | Implementation-аудит | Доказательства | Независимое ревью |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|
${tableRows.join("\n")}

## Definition of Done одного калькулятора на 9,5+

1. Нормативная геометрия, размерности и единицы проверены ручным эталоном.
2. Полевые коэффициенты имеют источник или явно помечены как проектные допущения; MIN/REC/MAX объяснимы.
3. \`exact_need\`, запас, округление, упаковки, покупка и остаток не смешаны.
4. Есть тесты типового, малого, большого, дробного и пограничного упаковочного сценария, а также регрессии найденных ошибок.
5. Web/mobile parity зелёный, а фактический desktop/mobile flow показывает тот же контракт понятным русским языком.
6. Для P0/P1 есть независимое предметное ревью; структурные тесты сами по себе его не заменяют.
`;

fs.writeFileSync(OUTPUT, content, "utf8");
console.log(`Generated ${path.relative(ROOT, OUTPUT)}: ${rows.length} calculators, ${structurallyReady} structurally ready.`);
