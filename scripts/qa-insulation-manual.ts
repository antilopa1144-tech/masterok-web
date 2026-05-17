/**
 * Ручной QA-прогон калькулятора утеплителя (без браузера).
 * Запуск: npx tsx scripts/qa-insulation-manual.ts
 */
import { insulationDef } from "../src/lib/calculators/formulas/insulation";
import { buildProductSelectOptions } from "../src/lib/calculators/insulation-catalog";
import {
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
} from "../src/lib/calculators/insulation-catalog";

const calc = (inputs: Record<string, number>) =>
  insulationDef.calculate({ accuracyMode: "basic", area: 50, ...inputs } as never);

function mainMaterialNames(materials: { name: string; category?: string; subtitle?: string }[]) {
  return materials
    .filter((m) => m.category?.startsWith("Утеплитель") || m.category === "Напыляемая изоляция")
    .map((m) => `${m.name} | ${m.subtitle ?? ""}`);
}

function companionSummary(materials: { name: string; category?: string }[]) {
  return materials
    .filter((m) => !m.category?.startsWith("Утеплитель") && m.category !== "Напыляемая изоляция")
    .map((m) => m.name)
    .slice(0, 8);
}

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  } else {
    console.log("OK:", msg);
  }
}

console.log("\n=== Опции линеек по форме ===\n");
const slabs = buildProductSelectOptions(INSULATION_FORM_SLABS).map((o) => o.label).join("|");
const rolls = buildProductSelectOptions(INSULATION_FORM_ROLLS).map((o) => o.label).join("|");
const spray = buildProductSelectOptions(INSULATION_FORM_SPRAY).map((o) => o.label).join("|");
assert(slabs.includes("Лайт Баттс") && slabs.includes("Пеноплэкс"), "плиты: минвата + пеноплекс");
assert(!slabs.includes("Тепло Roll"), "плиты: нет рулонов");
assert(rolls.includes("Техно 37") && rolls.includes("Тепло Roll"), "рулоны: 2 линейки");
assert(!rolls.includes("Лайт Баттс"), "рулоны: нет плит");
assert(spray.includes("Эковата") && !spray.includes("Rockwool"), "напыление: только эковата");

console.log("\n=== Список материалов по типам (50 м², 100 мм, СФТК) ===\n");

const scenarios: Array<{ name: string; inputs: Record<string, number> }> = [
  {
    name: "Rockwool плиты",
    inputs: { materialForm: 0, productId: 1, thickness: 100, mountSystem: 0, climateZone: 1 },
  },
  {
    name: "Пеноплэкс",
    inputs: { materialForm: 0, productId: 5, thickness: 100, mountSystem: 0, climateZone: 1 },
  },
  {
    name: "ППС",
    inputs: { materialForm: 0, productId: 7, thickness: 100, mountSystem: 0, climateZone: 1 },
  },
  {
    name: "Рулон Техно 37",
    inputs: {
      materialForm: 1,
      productId: 8,
      thickness: 100,
      mountSystem: 1,
      application: 2,
      climateZone: 1,
    },
  },
  {
    name: "Эковата",
    inputs: {
      materialForm: 2,
      productId: 10,
      thickness: 100,
      mountSystem: 1,
      application: 2,
      climateZone: 1,
    },
  },
  {
    name: "Пол минвата",
    inputs: { materialForm: 0, productId: 1, thickness: 100, application: 3, climateZone: 1 },
  },
  {
    name: "Внутренняя стена",
    inputs: { materialForm: 0, productId: 1, thickness: 100, application: 1, climateZone: 1 },
  },
];

const mainHashes = new Set<string>();

for (const s of scenarios) {
  const r = calc(s.inputs);
  const main = mainMaterialNames(r.materials);
  const hash = `${s.inputs.application ?? 0};;${s.inputs.materialForm ?? 0};;${main.join(";;")}`;
  console.log(`--- ${s.name} ---`);
  console.log("  Основное:", main[0] ?? "(нет)");
  console.log("  Сопутствующие:", companionSummary(r.materials).join("; ") || "(нет)");
  console.log("  Карточка:", r.summaryCards?.[0]?.value, r.summaryCards?.[0]?.unit);
  mainHashes.add(hash);

  if (s.name === "Rockwool плиты") {
    assert(main[0]?.includes("Rockwool") ?? false, "минвата: имя линейки");
    assert(main[0]?.includes("1200×600") ?? false, "минвата: размер в subtitle");
    assert(r.materials.some((m) => m.name.includes("Дюбели")), "минвата СФТК: дюбели");
    assert(r.materials.some((m) => m.name.includes("Клей фасадный")), "минвата СФТК: клей");
    assert(!r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц")), "минвата СФТК: нет пароизоляции");
    assert(r.materialListBanner?.includes("СФТК") ?? false, "минвата: баннер СФТК");
    const mainRow = r.materials.find((m) => m.highlight);
    assert(mainRow?.subtitle?.includes("Слой 100") ?? false, "минвата: subtitle слоя");
  }
  if (s.name === "Пеноплэкс") {
    assert(main[0]?.includes("Пеноплэкс") ?? false, "ЭППС: имя");
    assert(main[0]?.includes("1185×585") ?? false, "ЭППС: размер плиты");
    assert(!r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц")), "ЭППС: нет пароизоляции");
  }
  if (s.name === "Рулон Техно 37") {
    assert(main[0]?.includes("рулон") || main[0]?.includes("Техно") || false, "рулон: имя");
    assert(r.summaryCards?.[0]?.unit === "рулонов", "рулон: единица в карточке");
    assert(!r.materials.some((m) => m.name.includes("Дюбели")), "рулон каркас: без дюбелей");
    assert(!r.materials.some((m) => m.name.includes("Клей фасадный")), "рулон: без клея СФТК");
    assert(!r.materials.some((m) => m.name.includes("Стеклосетка")), "рулон: без сетки");
    assert(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц")), "рулон кровля: пароизоляция");
    assert(r.materialListBanner?.includes("Кровля") ?? false, "рулон: баннер кровли");
    assert(r.materials.some((m) => m.highlight), "рулон: highlight основного");
  }
  if (s.name === "Эковата") {
    assert(main[0]?.includes("Эковата") ?? false, "эковата: имя");
    assert(r.summaryCards?.[0]?.unit === "мешков", "эковата: мешки");
    assert(!r.materials.some((m) => m.name.includes("Дюбели")), "эковата: без дюбелей");
    assert(!r.materials.some((m) => m.name.includes("Клей фасадный")), "эковата: без клея СФТК");
    assert(
      r.materialListBanner?.toLowerCase().includes("напыляем") ?? false,
      "эковата: баннер",
    );
  }
  if (s.name === "Пол минвата") {
    assert(!r.materials.some((m) => m.name.includes("Брус 50×50")), "пол: без бруса");
    assert(!r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит")), "пол: без ветрозащиты");
    assert(r.materialListBanner?.includes("Пол") ?? false, "пол: баннер");
  }
  if (s.name === "Внутренняя стена") {
    assert(!r.materials.some((m) => m.name.toLowerCase().includes("ветрозащит")), "внутри: без ветрозащиты");
    assert(r.materials.some((m) => m.name.toLowerCase().includes("пароизоляц")), "внутри: пароизоляция");
  }
}

assert(mainHashes.size === scenarios.length, `все основные позиции различаются (${mainHashes.size}/${scenarios.length})`);

console.log("\n=== Климат → толщина (программно) ===\n");
const rCenter = calc({
  materialForm: 0,
  productId: 1,
  thickness: 150,
  climateZone: 1,
  mountSystem: 0,
});
const rSouth = calc({
  materialForm: 0,
  productId: 1,
  thickness: 100,
  climateZone: 0,
  mountSystem: 0,
});
assert(
  (rCenter.materials.find((m) => m.category?.includes("плиты"))?.name.includes("150") ?? false),
  "центр 150 мм в названии",
);
assert(
  (rSouth.materials.find((m) => m.category?.includes("плиты"))?.name.includes("100") ?? false),
  "юг 100 мм в названии",
);

console.log("\n=== Несовпадение формы и линейки ===\n");
const mismatch = calc({
  materialForm: INSULATION_FORM_ROLLS,
  productId: 1,
  thickness: 100,
});
assert(
  mismatch.warnings.some((w) => w.includes("не подходит к форме")),
  "предупреждение при плита+рулоны",
);

console.log(failed === 0 ? "\n✅ Все проверки пройдены\n" : `\n❌ Ошибок: ${failed}\n`);
process.exit(failed > 0 ? 1 : 0);
