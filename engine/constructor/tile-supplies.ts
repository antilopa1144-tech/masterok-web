import type { ConstructorRoom, PurchaseLine, RoomCalculation, TileSupplies, TileSupplySpec } from "./model";

export function createTileSupply(kind: keyof TileSupplies): TileSupplySpec {
  return { materialKey: kind === "adhesive" ? "Плиточный клей" : "Затирка", consumptionKgM2: 0, reservePercent: 0,
    packageKg: kind === "adhesive" ? 25 : 2, packagePriceRub: 0 };
}

export function validateTileSupplies(supplies: TileSupplies): string[] {
  if (!supplies || typeof supplies !== "object" || Array.isArray(supplies)) return ["Повреждены параметры клея и затирки."];
  const errors: string[] = [];
  for (const kind of ["adhesive", "grout"] as const) {
    const spec = supplies[kind]; if (spec === undefined) continue;
    const label = kind === "adhesive" ? "Клей" : "Затирка";
    if (!spec || typeof spec !== "object" || Array.isArray(spec)) { errors.push(`${label}: повреждены параметры товара.`); continue; }
    if (typeof spec.materialKey !== "string" || !spec.materialKey.trim() || spec.materialKey.length > 150) errors.push(`${label}: введите название до 150 символов.`);
    for (const [field, min, max, name] of [["consumptionKgM2", 0, 100, "расход"], ["reservePercent", 0, 100, "дополнительный запас"],
      ["packageKg", .1, 100, "масса упаковки"], ["packagePriceRub", 0, 10_000_000, "цена"]] as const) {
      if (!Number.isFinite(spec[field]) || spec[field] < min || spec[field] > max) errors.push(`${label}: ${name} должен быть от ${min} до ${max}.`);
    }
  }
  return errors;
}

/** Десятичная арифметика сохраняет реальный малый запас и не добавляет пачку из-за двоичной погрешности. */
type Decimal = { n: bigint; scale: number };
// Не используем ** для BigInt: target ES5 превращает её в Math.pow в клиентской сборке Next.js.
function power10(power: number): bigint { let value = BigInt(1); for (let index = 0; index < power; index++) value *= BigInt(10); return value; }
function decimal(value: number): Decimal {
  const [digits, exponent = "0"] = String(value).split("e");
  const scale = (digits.split(".")[1]?.length ?? 0) - Number(exponent);
  const n = BigInt(digits.replace(".", ""));
  return scale < 0 ? { n: n * power10(-scale), scale: 0 } : { n, scale };
}
function sum(values: Decimal[]): Decimal {
  const scale = Math.max(0, ...values.map((value) => value.scale));
  return { scale, n: values.reduce((total, value) => total + value.n * power10(scale - value.scale), BigInt(0)) };
}
function multiply(...values: Decimal[]): Decimal { return { n: values.reduce((n, value) => n * value.n, BigInt(1)), scale: values.reduce((s, value) => s + value.scale, 0) }; }
function number(value: Decimal): number { return Number(value.n) / 10 ** value.scale; }
function ceilRatio(need: Decimal, pack: Decimal): number {
  const n = need.n * power10(pack.scale), d = pack.n * power10(need.scale);
  return Number((n + d - BigInt(1)) / d);
}

/** По площади укладки, включая швы, без запаса плитки и избытка её упаковок. */
export function tileSupplyArea(room: RoomCalculation): number {
  return (room.floorTiles?.netAreaM2 ?? 0) + room.walls.reduce((sum, wall) => sum + wall.netAreaM2, 0);
}

export function calculateTileSupplies(rooms: ConstructorRoom[], calculations: RoomCalculation[]): Omit<PurchaseLine, "id">[] {
  const result: Omit<PurchaseLine, "id">[] = [];
  for (const kind of ["adhesive", "grout"] as const) {
    const groups = new Map<string, Array<{ room: ConstructorRoom; spec: TileSupplySpec; areas: number[] }>>();
    rooms.forEach((room, index) => {
      const spec = room.tileSupplies?.[kind]; if (!spec || spec.consumptionKgM2 === 0) return;
      const calculation = calculations[index];
      const areas = [calculation.floorTiles?.netAreaM2 ?? 0, ...calculation.walls.map((wall) => wall.netAreaM2)].filter((area) => area > 0);
      if (!areas.length) return;
      const key = JSON.stringify([spec.materialKey, spec.packageKg]);
      const group = groups.get(key) ?? []; group.push({ room, spec, areas }); groups.set(key, group);
    });
    groups.forEach((group) => {
      const spec = group[0].spec;
      const exact = sum(group.flatMap(({ spec, areas }) => areas.map((area) => multiply(decimal(area), decimal(spec.consumptionKgM2)))));
      const reserve = sum(group.flatMap(({ spec, areas }) => areas.map((area) => { const value = multiply(decimal(area), decimal(spec.consumptionKgM2), decimal(spec.reservePercent)); return { ...value, scale: value.scale + 2 }; })));
      const need = sum([exact, reserve]); const packs = ceilRatio(need, decimal(spec.packageKg));
      const purchased = multiply(decimal(packs), decimal(spec.packageKg));
      const surplus = sum([purchased, { ...need, n: -need.n }]);
      const prices = group.map(({ spec }) => spec.packagePriceRub); const price = Math.max(...prices);
      const priceNote = !price ? "Цена не задана; стоимость позиции не включена в сумму." : new Set(prices).size > 1 ? "Цены отличаются; общая закупка оценена по максимальной введённой цене." : undefined;
      const fmt = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format(value);
      result.push({ kind: kind === "adhesive" ? "tile-adhesive" : "tile-grout", name: spec.materialKey, detail: `${fmt(spec.packageKg)} кг/упак.`,
        roomIds: group.map(({ room }) => room.id), unit: "упак.", quantity: packs, unitPriceRub: price, totalPriceRub: Math.round(packs * price * 100) / 100, priceNote,
        exactNeedKg: number(exact), reserveKg: number(reserve), neededKg: number(need), purchasedKg: number(purchased), packSurplusKg: number(surplus),
        basis: `${fmt(number(exact))} кг по площади укладки + ${fmt(number(reserve))} кг дополнительного запаса = ${fmt(number(need))} кг; после объединения помещений ${packs} упак. по ${fmt(spec.packageKg)} кг (${fmt(number(purchased))} кг; остаток упаковок ${fmt(number(surplus))} кг). Расход: ${group.map(({ room, spec, areas }) => `${room.name}: ${fmt(areas.reduce((sum, area) => sum + area, 0))} м² × ${fmt(spec.consumptionKgM2)} кг/м², запас ${fmt(spec.reservePercent)}%`).join("; ")}. Запас плитки и округление её упаковок не увеличивают площадь для смеси.${priceNote ? ` ${priceNote}` : ""}` });
    });
  }
  return result;
}
