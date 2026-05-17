/**
 * Полный аудит калькулятора утеплителя: все назначения × формы × ожидаемые сопутствующие.
 * Запуск: npx tsx scripts/qa-insulation-full-audit.ts
 */
import { insulationDef } from "../src/lib/calculators/formulas/insulation";
import { shouldShowMountSystemField } from "../src/lib/calculators/insulation-application";
import { shouldHideField } from "../src/components/calculator/useCalculator";
import {
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
} from "../src/lib/calculators/insulation-catalog";

const calc = (inputs: Record<string, number>) =>
  insulationDef.calculate({ accuracyMode: "basic", area: 50, thickness: 100, ...inputs } as never);

type Flags = {
  vapor: boolean;
  wind: boolean;
  frame: boolean;
  wet: boolean;
  dowels: boolean;
};

function flags(materials: { name: string }[]): Flags {
  const n = (s: string) => materials.some((m) => m.name.toLowerCase().includes(s));
  return {
    vapor: n("пароизоляц"),
    wind: n("ветрозащит") || n("гидроветрозащит"),
    frame: n("брус"),
    wet: n("клей фасадный") || n("стеклосетк"),
    dowels: materials.some((m) => m.name.includes("Дюбели")),
  };
}

const APPS = [
  { id: 0, name: "Фасад" },
  { id: 1, name: "Внутренняя" },
  { id: 2, name: "Кровля" },
  { id: 3, name: "Пол" },
  { id: 4, name: "Цоколь" },
] as const;

/** Ожидаемые сопутствующие для минваты плиты, productId=1 (Rockwool) */
const EXPECT_MINERAL: Record<
  number,
  { sfk: Flags; frame: Flags }
> = {
  0: {
    sfk: { vapor: false, wind: false, frame: false, wet: true, dowels: true },
    frame: { vapor: false, wind: true, frame: false, wet: false, dowels: false },
  },
  1: {
    sfk: { vapor: true, wind: false, frame: true, wet: false, dowels: false },
    frame: { vapor: true, wind: false, frame: true, wet: false, dowels: false },
  },
  2: {
    sfk: { vapor: true, wind: true, frame: true, wet: false, dowels: false },
    frame: { vapor: true, wind: true, frame: true, wet: false, dowels: false },
  },
  3: {
    sfk: { vapor: true, wind: false, frame: false, wet: false, dowels: false },
    frame: { vapor: true, wind: false, frame: false, wet: false, dowels: false },
  },
  4: {
    sfk: { vapor: false, wind: false, frame: false, wet: false, dowels: false },
    frame: { vapor: false, wind: false, frame: false, wet: false, dowels: false },
  },
};

let failed = 0;

function assertEq(actual: boolean, expected: boolean, msg: string) {
  if (actual !== expected) {
    console.error(`  FAIL: ${msg} (ожидали ${expected}, получили ${actual})`);
    failed++;
  }
}

function checkFlags(got: Flags, exp: Flags, label: string) {
  for (const key of Object.keys(exp) as (keyof Flags)[]) {
    assertEq(got[key], exp[key], `${label} → ${key}`);
  }
}

console.log("\n=== UI: поле «Система монтажа» ===\n");
for (const app of APPS) {
  const values = { application: app.id, productId: 1, materialForm: 0 };
  const mountField = insulationDef.fields.find((f) => f.key === "mountSystem")!;
  const hidden = shouldHideField(mountField, values);
  const expectHidden = !shouldShowMountSystemField(app.id);
  assertEq(hidden, expectHidden, `${app.name}: hide mountSystem`);
  console.log(`  ${app.name}: поле монтажа ${hidden ? "скрыто" : "видно"} — OK`);
}

console.log("\n=== Расчёт: минвата плиты (product 1) по назначениям ===\n");
for (const app of APPS) {
  const exp = EXPECT_MINERAL[app.id];
  if (app.id === 0) {
    const sfk = calc({
      application: app.id,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 0,
    });
    const vent = calc({
      application: app.id,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 1,
    });
    console.log(`--- ${app.name} СФТК ---`);
    checkFlags(flags(sfk.materials), exp.sfk, "СФТК");
    console.log(`  баннер: ${sfk.materialListBanner?.slice(0, 60)}…`);
    console.log(`--- ${app.name} вентфасад ---`);
    checkFlags(flags(vent.materials), exp.frame, "вентфасад");
  } else {
    const r = calc({
      application: app.id,
      productId: 1,
      materialForm: INSULATION_FORM_SLABS,
      mountSystem: 0,
    });
    console.log(`--- ${app.name} (mount принудительно → ${r.totals.mountSystem}) ---`);
    checkFlags(flags(r.materials), exp.frame, app.name);
    console.log(`  баннер: ${r.materialListBanner ?? "(нет)"}`);
    assertEq(r.totals.mountSystem === 1, true, `${app.name}: mountSystem=1`);
  }
}

console.log("\n=== Расчёт: пеноплекс на полу (product 5) — без мембран ===\n");
{
  const r = calc({
    application: 3,
    productId: 5,
    materialForm: INSULATION_FORM_SLABS,
  });
  const f = flags(r.materials);
  assertEq(f.vapor, false, "пол ЭППС: пароизоляция");
  assertEq(f.wind, false, "пол ЭППС: ветрозащита");
  assertEq(f.frame, false, "пол ЭППС: брус");
  console.log(`  сопутствующие: ${r.materials.filter((m) => !m.highlight).map((m) => m.name).join("; ") || "(нет)"}`);
}

console.log("\n=== Расчёт: формы утеплителя (фасад СФТК) ===\n");
{
  const slab = calc({
    application: 0,
    productId: 5,
    materialForm: INSULATION_FORM_SLABS,
    mountSystem: 0,
  });
  const roll = calc({
    application: 0,
    productId: 8,
    materialForm: INSULATION_FORM_ROLLS,
    mountSystem: 1,
  });
  const spray = calc({
    application: 2,
    productId: 10,
    materialForm: INSULATION_FORM_SPRAY,
  });
  assertEq(slab.summaryCards?.[0].unit === "упаковок", true, "плиты: упаковки");
  assertEq(roll.summaryCards?.[0].unit === "рулонов", true, "рулоны: рулоны");
  assertEq(spray.summaryCards?.[0].unit === "мешков", true, "напыление: мешки");
  assertEq(flags(roll.materials).wet, false, "рулон фасад вент: без СФТК");
  console.log(`  плиты: ${slab.summaryCards?.[0].value} ${slab.summaryCards?.[0].unit}`);
  console.log(`  рулоны: ${roll.summaryCards?.[0].value} ${roll.summaryCards?.[0].unit}`);
  console.log(`  эковата: ${spray.summaryCards?.[0].value} ${spray.summaryCards?.[0].unit}`);
}

console.log("\n=== Климат → толщина ===\n");
{
  const south = calc({ application: 0, productId: 1, climateZone: 0, thickness: 100 });
  const center = calc({ application: 0, productId: 1, climateZone: 1, thickness: 150 });
  const mainS = south.materials.find((m) => m.highlight);
  const mainC = center.materials.find((m) => m.highlight);
  assertEq(mainS?.name.includes("100") ?? false, true, "юг 100мм в названии");
  assertEq(mainC?.name.includes("150") ?? false, true, "центр 150мм в названии");
}

console.log("\n=== Покупка: purchaseQty ≥ 1 у всех позиций ===\n");
for (const app of APPS) {
  const r = calc({ application: app.id, productId: 1 });
  for (const m of r.materials) {
    const q = m.purchaseQty ?? m.withReserve ?? m.quantity;
    if (!(q > 0)) {
      console.error(`  FAIL: ${app.name} — нулевая позиция ${m.name}`);
      failed++;
    }
  }
}

console.log(
  failed === 0
    ? "\n✅ Полный аудит пройден\n"
    : `\n❌ Ошибок аудита: ${failed}\n`,
);
process.exit(failed > 0 ? 1 : 0);
