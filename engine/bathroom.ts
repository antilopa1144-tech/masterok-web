import { combineScenarioFactors, type FactorTable } from "./factors";
import { optimizePackaging } from "./packaging";
import { SCENARIOS, type ScenarioBundle } from "./scenarios";
import type {
  BathroomCanonicalSpec,
  CanonicalCalculatorResult,
  CanonicalMaterialResult,
} from "./canonical";
import { roundDisplay } from "./units";

/* ─── constants ─── */

const FLOOR_TILE_SIZES: Record<number, { w: number; h: number }> = {
  0: { w: 0.3, h: 0.3 },
  1: { w: 0.45, h: 0.45 },
  2: { w: 0.6, h: 0.6 },
};

const WALL_TILE_SIZES: Record<number, { w: number; h: number }> = {
  0: { w: 0.2, h: 0.3 },
  1: { w: 0.25, h: 0.4 },
  2: { w: 0.3, h: 0.6 },
};

const TILE_RESERVE = 1.10;
const FLOOR_ADHESIVE_KG_PER_M2 = 5;
const WALL_ADHESIVE_KG_PER_M2 = 3.5;
const ADHESIVE_BAG_KG = 25;
const GROUT_KG_PER_M2 = 0.5;
const GROUT_BAG_KG = 2;
const WATERPROOF_MASTIC_KG_PER_M2 = 1.5;
const WATERPROOF_BUCKET_KG = 4;
const WATERPROOF_WALL_HEIGHT = 0.2;
const PRIMER_L_PER_M2 = 0.2;
const PRIMER_CAN_L = 5;
const CROSSES_PER_TILE = 3;
const CROSSES_PACK = 100;
const SILICONE_M_PER_TUBE = 3;

/* ─── labels ─── */

const FLOOR_TILE_LABELS: Record<number, string> = {
  0: "300×300 мм",
  1: "450×450 мм",
  2: "600×600 мм",
};

const WALL_TILE_LABELS: Record<number, string> = {
  0: "200×300 мм",
  1: "250×400 мм",
  2: "300×600 мм",
};

/* ─── inputs ─── */

interface BathroomInputs {
  length?: number;
  width?: number;
  height?: number;
  floorTileSize?: number;
  wallTileSize?: number;
  hasWaterproofing?: number;
  doorWidth?: number;
}

/* ─── helpers ─── */

function getInputDefault(spec: BathroomCanonicalSpec, key: string, fallback: number): number {
  return spec.input_schema.find((field) => field.key === key)?.default_value ?? fallback;
}

/* ─── main ─── */

export function computeCanonicalBathroom(
  spec: BathroomCanonicalSpec,
  inputs: BathroomInputs,
  factorTable: FactorTable,
): CanonicalCalculatorResult {
  const length = Math.max(1, Math.min(10, inputs.length ?? getInputDefault(spec, "length", 2.5)));
  const width = Math.max(1, Math.min(10, inputs.width ?? getInputDefault(spec, "width", 1.7)));
  const height = Math.max(2, Math.min(3.5, inputs.height ?? getInputDefault(spec, "height", 2.5)));
  const floorTileSize = Math.max(0, Math.min(2, Math.round(inputs.floorTileSize ?? getInputDefault(spec, "floorTileSize", 0))));
  const wallTileSize = Math.max(0, Math.min(2, Math.round(inputs.wallTileSize ?? getInputDefault(spec, "wallTileSize", 0))));
  const hasWaterproofing = Math.max(0, Math.min(1, Math.round(inputs.hasWaterproofing ?? getInputDefault(spec, "hasWaterproofing", 1))));
  const doorWidth = Math.max(0.6, Math.min(1.0, inputs.doorWidth ?? getInputDefault(spec, "doorWidth", 0.7)));

  /* ─── geometry ─── */
  const floorArea = roundDisplay(length * width, 3);
  const perimeter = roundDisplay(2 * (length + width), 3);
  const wallArea = roundDisplay(perimeter * height - doorWidth * 2.1, 3);

  /* ─── tiles ─── */
  const floorTile = FLOOR_TILE_SIZES[floorTileSize] ?? FLOOR_TILE_SIZES[0];
  const wallTile = WALL_TILE_SIZES[wallTileSize] ?? WALL_TILE_SIZES[0];
  const floorTileArea = roundDisplay(floorTile.w * floorTile.h, 6);
  const wallTileArea = roundDisplay(wallTile.w * wallTile.h, 6);
  const tilesFloor = Math.ceil(floorArea / floorTileArea * TILE_RESERVE);
  const tilesWall = Math.ceil(wallArea / wallTileArea * TILE_RESERVE);

  /* ─── adhesive ─── */
  const floorAdhesiveBags = Math.ceil(floorArea * FLOOR_ADHESIVE_KG_PER_M2 / ADHESIVE_BAG_KG);
  const wallAdhesiveBags = Math.ceil(wallArea * WALL_ADHESIVE_KG_PER_M2 / ADHESIVE_BAG_KG);

  /* ─── grout ─── */
  const groutBags = Math.ceil((floorArea + wallArea) * GROUT_KG_PER_M2 / GROUT_BAG_KG);

  /* ─── waterproofing ─── */
  let masticBuckets = 0;
  let tapeRolls = 0;
  if (hasWaterproofing) {
    masticBuckets = Math.ceil((floorArea + perimeter * WATERPROOF_WALL_HEIGHT) * WATERPROOF_MASTIC_KG_PER_M2 / WATERPROOF_BUCKET_KG);
    tapeRolls = Math.ceil((perimeter + 1.2) / 10);
  }

  /* ─── primer ─── */
  const primerCans = Math.ceil((floorArea + wallArea) * PRIMER_L_PER_M2 / PRIMER_CAN_L);

  /* ─── crosses ─── */
  const crossesPacks = Math.ceil((tilesFloor + tilesWall) * CROSSES_PER_TILE / CROSSES_PACK);

  /* ─── silicone ─── */
  const siliconeTubes = Math.ceil(perimeter / SILICONE_M_PER_TUBE);

  /* ─── scenarios (tiles as primary unit) ─── */
  const totalTiles = tilesFloor + tilesWall;
  const packageOptions = [{
    size: 1,
    label: "bathroom-tile-piece",
    unit: "шт",
  }];

  const scenarios = SCENARIOS.reduce((acc, scenario) => {
    const { multiplier, keyFactors } = combineScenarioFactors(factorTable, spec.field_factors.enabled, scenario);
    const exactNeed = roundDisplay(totalTiles * multiplier, 6);
    const packaging = optimizePackaging(exactNeed, packageOptions);

    acc[scenario] = {
      exact_need: exactNeed,
      purchase_quantity: roundDisplay(packaging.purchaseQuantity, 6),
      leftover: roundDisplay(packaging.leftover, 6),
      assumptions: [
        `formula_version:${spec.formula_version}`,
        `floorTileSize:${floorTileSize}`,
        `wallTileSize:${wallTileSize}`,
        `hasWaterproofing:${hasWaterproofing}`,
        `packaging:${packaging.package.label}`,
      ],
      key_factors: {
        ...keyFactors,
        field_multiplier: roundDisplay(multiplier, 6),
      },
      buy_plan: {
        package_label: packaging.package.label,
        package_size: packaging.package.size,
        packages_count: packaging.packageCount,
        unit: packaging.package.unit,
      },
    };

    return acc;
  }, {} as ScenarioBundle);

  const recScenario = scenarios.REC;

  /* ─── materials ─── */
  const materials: CanonicalMaterialResult[] = [
    {
      name: `Плитка напольная ${FLOOR_TILE_LABELS[floorTileSize] ?? "300×300 мм"}`,
      quantity: tilesFloor,
      unit: "шт",
      withReserve: tilesFloor,
      purchaseQty: tilesFloor,
      category: "Плитка",
    },
    {
      name: `Плитка настенная ${WALL_TILE_LABELS[wallTileSize] ?? "200×300 мм"}`,
      quantity: tilesWall,
      unit: "шт",
      withReserve: tilesWall,
      purchaseQty: tilesWall,
      category: "Плитка",
    },
    {
      name: `Клей для напольной плитки (${ADHESIVE_BAG_KG} кг)`,
      quantity: roundDisplay(floorArea * FLOOR_ADHESIVE_KG_PER_M2, 3),
      unit: "кг",
      withReserve: floorAdhesiveBags * ADHESIVE_BAG_KG,
      purchaseQty: floorAdhesiveBags * ADHESIVE_BAG_KG,
      packageInfo: { count: floorAdhesiveBags, size: ADHESIVE_BAG_KG, packageUnit: "мешков" },
      category: "Клей",
    },
    {
      name: `Клей для настенной плитки (${ADHESIVE_BAG_KG} кг)`,
      quantity: roundDisplay(wallArea * WALL_ADHESIVE_KG_PER_M2, 3),
      unit: "кг",
      withReserve: wallAdhesiveBags * ADHESIVE_BAG_KG,
      purchaseQty: wallAdhesiveBags * ADHESIVE_BAG_KG,
      packageInfo: { count: wallAdhesiveBags, size: ADHESIVE_BAG_KG, packageUnit: "мешков" },
      category: "Клей",
    },
    {
      name: `Затирка (${GROUT_BAG_KG} кг)`,
      quantity: roundDisplay((floorArea + wallArea) * GROUT_KG_PER_M2, 3),
      unit: "кг",
      withReserve: groutBags * GROUT_BAG_KG,
      purchaseQty: groutBags * GROUT_BAG_KG,
      packageInfo: { count: groutBags, size: GROUT_BAG_KG, packageUnit: "мешков" },
      category: "Затирка",
    },
  ];

  if (hasWaterproofing) {
    materials.push(
      {
        name: `Мастика гидроизоляционная (${WATERPROOF_BUCKET_KG} кг)`,
        quantity: roundDisplay((floorArea + perimeter * WATERPROOF_WALL_HEIGHT) * WATERPROOF_MASTIC_KG_PER_M2, 3),
        unit: "кг",
        withReserve: masticBuckets * WATERPROOF_BUCKET_KG,
        purchaseQty: masticBuckets * WATERPROOF_BUCKET_KG,
        packageInfo: { count: masticBuckets, size: WATERPROOF_BUCKET_KG, packageUnit: "вёдер" },
        category: "Гидроизоляция",
      },
      {
        name: "Лента гидроизоляционная (10 м)",
        quantity: roundDisplay(perimeter + 1.2, 3),
        unit: "м",
        withReserve: tapeRolls * 10,
        purchaseQty: tapeRolls * 10,
        packageInfo: { count: tapeRolls, size: 10, packageUnit: "рулонов" },
        category: "Гидроизоляция",
      },
    );
  }

  materials.push(
    {
      name: `Грунтовка (${PRIMER_CAN_L} л)`,
      quantity: roundDisplay((floorArea + wallArea) * PRIMER_L_PER_M2, 3),
      unit: "л",
      withReserve: primerCans * PRIMER_CAN_L,
      purchaseQty: primerCans * PRIMER_CAN_L,
      packageInfo: { count: primerCans, size: PRIMER_CAN_L, packageUnit: "канистр" },
      category: "Подготовка",
    },
    {
      name: `Крестики (упаковка ${CROSSES_PACK} шт)`,
      quantity: (tilesFloor + tilesWall) * CROSSES_PER_TILE,
      unit: "шт",
      withReserve: crossesPacks * CROSSES_PACK,
      purchaseQty: crossesPacks * CROSSES_PACK,
      packageInfo: { count: crossesPacks, size: CROSSES_PACK, packageUnit: "упаковок" },
      category: "Крепёж",
    },
    {
      name: "Силиконовый герметик",
      quantity: siliconeTubes,
      unit: "туб",
      withReserve: siliconeTubes,
      purchaseQty: siliconeTubes,
      category: "Герметик",
    },
  );

  /* ─── warnings ─── */
  const warnings: string[] = [];
  if (floorArea < 2) {
    warnings.push("При площади менее 2 м² повышенный расход на подрезку плитки");
  }
  if (!hasWaterproofing) {
    warnings.push("Гидроизоляция обязательна согласно СП 29.13330");
  }


  const practicalNotes: string[] = [];
  practicalNotes.push("В ванной гидроизоляцию делайте по всему полу и по стенам на высоту 200 мм. В зоне душа — до потолка");

  return {
    canonicalSpecId: spec.calculator_id,
    formulaVersion: spec.formula_version,
    materials,
    totals: {
      length: roundDisplay(length, 3),
      width: roundDisplay(width, 3),
      height: roundDisplay(height, 3),
      floorTileSize,
      wallTileSize,
      hasWaterproofing,
      doorWidth: roundDisplay(doorWidth, 3),
      floorArea,
      perimeter,
      wallArea,
      floorTileArea,
      wallTileArea,
      tilesFloor,
      tilesWall,
      totalTiles,
      floorAdhesiveBags,
      wallAdhesiveBags,
      groutBags,
      masticBuckets,
      tapeRolls,
      primerCans,
      crossesPacks,
      siliconeTubes,
      minExactNeed: scenarios.MIN.exact_need,
      recExactNeed: recScenario.exact_need,
      maxExactNeed: scenarios.MAX.exact_need,
      minPurchase: scenarios.MIN.purchase_quantity,
      recPurchase: recScenario.purchase_quantity,
      maxPurchase: scenarios.MAX.purchase_quantity,
    },
    warnings,
    practicalNotes,
    scenarios,
  };
}
