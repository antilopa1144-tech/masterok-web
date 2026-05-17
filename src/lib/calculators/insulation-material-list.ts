import type { MaterialResult } from "./types";
import {
  INSULATION_FORM_ROLLS,
  INSULATION_FORM_SLABS,
  INSULATION_FORM_SPRAY,
  type InsulationCatalogProduct,
} from "./insulation-catalog";

/** Порядок групп в списке материалов (как на объекте: сначала утеплитель, потом крепёж и пирог). */
const CATEGORY_ORDER: Record<string, number> = {
  "Утеплитель (плиты)": 10,
  "Утеплитель (пеноплекс)": 10,
  "Утеплитель (пенопласт)": 10,
  "Утеплитель (рулоны)": 10,
  "Напыляемая изоляция": 10,
  Основное: 10,
  "Крепёж (СФТК)": 20,
  Крепёж: 20,
  Изоляция: 30,
  Каркас: 40,
  Клей: 50,
  Армирование: 60,
  Штукатурка: 70,
  Подготовка: 80,
};

function isMainInsulationCategory(category?: string): boolean {
  if (!category) return false;
  return (
    category.startsWith("Утеплитель") ||
    category === "Основное" ||
    category === "Напыляемая изоляция"
  );
}

function categorySortKey(category?: string): number {
  if (!category) return 900;
  return CATEGORY_ORDER[category] ?? 500;
}

function companionSubtitle(m: MaterialResult): string | undefined {
  const n = m.name.toLowerCase();
  if (n.includes("дюбел")) return "Тарельчатые, норма расхода зависит от типа плиты (СФТК)";
  if (n.includes("клей фасад")) return "Приклеивание плит к основанию, ~5 кг/м²";
  if (n.includes("стеклосетк")) return "Армирующий слой базовой штукатурки, нахлёст ~10%";
  if (n.includes("штукатур") && n.includes("базов")) return "Армирующий слой 3–4 мм поверх сетки";
  if (n.includes("грунтовк")) return "Перед нанесением базового слоя на основание";
  if (n.includes("пароизоляц")) return "Изнутри помещения, нахлёст полос 10–15 см";
  if (n.includes("ветрозащит") || n.includes("гидроветрозащит"))
    return "Снаружи утеплителя, нахлёст 10–15 см";
  if (n.includes("скотч") && n.includes("пароизоляц")) return "Проклейка стыков мембраны";
  if (n.includes("брус")) return "Каркас под утеплитель, шаг ~600 мм";
  if (n.includes("саморез")) return "Крепление бруса к основанию";
  return undefined;
}

function buildMainSubtitle(
  m: MaterialResult,
  product: InsulationCatalogProduct | null,
  materialForm: number,
  thickness: number,
): string {
  const parts: string[] = [];
  if (product) {
    if (product.form === "slabs" && product.plateLengthMm && product.plateWidthMm) {
      parts.push(
        `Плита ${product.plateLengthMm}×${product.plateWidthMm} мм · ${product.plateAreaM2} м²`,
      );
    } else if (product.form === "rolls" && product.rollWidthMm && product.rollLengthMm) {
      parts.push(
        `Рулон ${product.rollWidthMm}×${product.rollLengthMm} мм · ${product.rollAreaM2} м²`,
      );
    } else if (product.form === "spray") {
      parts.push(`Напыление · ~${product.ecowoolDensityKgM3 ?? 35} кг/м³ укладки`);
    }
    if (product.densityKgM3) parts.push(`${product.densityKgM3} кг/м³`);
  } else if (materialForm === INSULATION_FORM_ROLLS) {
    parts.push("Рулон (размер задайте по этикетке)");
  }
  parts.push(`Слой ${thickness} мм`);
  if (m.packageInfo && m.packageInfo.count > 0) {
    parts.push(
      `${m.packageInfo.count} ${m.packageInfo.packageUnit} × ${m.packageInfo.size} ${m.unit}`,
    );
  }
  return parts.join(" · ");
}

export interface InsulationMaterialListContext {
  materialForm: number;
  mountSystem: number;
  area: number;
  thickness: number;
  product: InsulationCatalogProduct | null;
}

export function buildMaterialListBanner(ctx: InsulationMaterialListContext): string {
  const { materialForm, mountSystem, area, thickness, product } = ctx;
  const productName = product ? `${product.manufacturer} ${product.lineName}` : null;

  if (materialForm === INSULATION_FORM_ROLLS) {
    const mount =
      mountSystem === 0
        ? "для рулонов выберите каркасную систему"
        : "каркас + мембраны";
    return `Рулон · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""} · ${mount}`;
  }
  if (materialForm === INSULATION_FORM_SPRAY) {
    return `Напыляемая эковата · ${area} м² × ${thickness} мм · каркас, без СФТК`;
  }
  if (mountSystem === 0) {
    const type =
      product?.insulationTypeId === 1
        ? "пеноплекс"
        : product?.insulationTypeId === 2
          ? "пенопласт"
          : "минвата";
    return `СФТК (мокрый фасад) · ${type} · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""}`;
  }
  return `Каркас / вентфасад · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""} · мембраны + брус`;
}

/** Упорядочивает и обогащает список материалов под калькулятор утеплителя. */
export function organizeInsulationMaterials(
  materials: MaterialResult[],
  ctx: InsulationMaterialListContext,
): MaterialResult[] {
  const filtered = materials.filter((m) => {
    const q = m.purchaseQty ?? m.withReserve ?? m.quantity;
    return q > 0 && !Number.isNaN(q);
  });

  const enriched = filtered.map((m) => {
    const main = isMainInsulationCategory(m.category);
    const subtitle = main
      ? buildMainSubtitle(m, ctx.product, ctx.materialForm, ctx.thickness)
      : m.subtitle ?? companionSubtitle(m);

    return {
      ...m,
      subtitle,
      highlight: main,
    };
  });

  enriched.sort((a, b) => {
    const ca = categorySortKey(a.category);
    const cb = categorySortKey(b.category);
    if (ca !== cb) return ca - cb;
    if (a.highlight && !b.highlight) return -1;
    if (!a.highlight && b.highlight) return 1;
    return a.name.localeCompare(b.name, "ru");
  });

  return enriched;
}
