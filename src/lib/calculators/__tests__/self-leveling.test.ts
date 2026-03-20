import { describe, expect, it } from 'vitest';
import selfLevelingFixture from '../../../../tests/fixtures/self-leveling-canonical-parity.json';
import { selfLevelingDef } from '../formulas/self-leveling';
import { runCanonicalParitySuite } from './canonical-parity';
import { checkInvariants, findMaterial, withBasicAccuracy } from './_helpers';

const calc = withBasicAccuracy(selfLevelingDef.calculate.bind(selfLevelingDef));

describe('Наливной пол', () => {
  it('декларирует formulaVersion для canonical self-leveling', () => {
    expect(selfLevelingDef.formulaVersion).toBe('self-leveling-canonical-v1');
  });

  it('добавляет предупреждение для тонкого слоя выравнивающей смеси', () => {
    const result = calc({ inputMode: 1, area: 20, thickness: 4, mixtureType: 0, bagWeight: 25 });
    expect(result.warnings.some((warning) => warning.includes('5 мм'))).toBe(true);
  });
});

runCanonicalParitySuite({
  suiteName: 'Canonical self-leveling fixture parity',
  cases: selfLevelingFixture.cases as any,
  calculate: calc,
  assertCase(result, expected: {
    formulaVersion: string; area: number; perimeter: number; warningsCount: number;
    materials: { bags: number; primerCans: number; tapeRolls: number };
    recScenario: { packageSize: number; exactNeed: number; purchaseQuantity: number };
  }) {
    expect(result.formulaVersion).toBe(expected.formulaVersion);
    expect(result.totals.area).toBeCloseTo(expected.area, 0.05);
    expect(result.totals.perimeter).toBeCloseTo(expected.perimeter, 0.05);
    expect(result.warnings).toHaveLength(expected.warningsCount);

    const recScenario = result.scenarios!.REC;
    expect(recScenario.buy_plan.package_size).toBe(expected.recScenario.packageSize);
    expect(recScenario.exact_need).toBeCloseTo(expected.recScenario.exactNeed, 0.00001);
    expect(recScenario.purchase_quantity).toBeCloseTo(expected.recScenario.purchaseQuantity, 0.00001);

    expect(findMaterial(result, 'мешки')?.purchaseQty ?? findMaterial(result, 'смесь')?.purchaseQty).toBe(expected.materials.bags);
    const _pm = findMaterial(result, 'Грунтовка'); expect(_pm).toBeTruthy(); expect(_pm!.purchaseQty).toBeGreaterThan(0);
    expect(findMaterial(result, 'Демпферная')?.purchaseQty).toBe(expected.materials.tapeRolls);

    checkInvariants(result);
  },
});
