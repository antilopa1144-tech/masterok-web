import type { MaterialResult } from "./types";
import {
  applicationMountLabel,
  INSULATION_APPLICATION,
} from "./insulation-application";
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
  if (n.includes("дюбел"))
    return "Тарельчатые анкеры: справочная норма движка +5%; тип, длину, основание и раскладку задают проект и документация СФТК";
  if (n.includes("клей фасад"))
    return "Предварительно 5 кг/м², мешки 25 кг; фактический расход и совместимость — по техкарте системы";
  if (n.includes("стеклосетк"))
    return "Предварительно площадь ×1,10, рулоны 50 м²; усиления и нахлёсты — по проекту системы";
  if (n.includes("штукатур") && n.includes("базов"))
    return "Предварительно 5 кг/м², мешки 25 кг; толщина слоя и расход — по техкарте";
  if (n.includes("грунтовк"))
    return "Предварительно 0,15 л/м² ×1,15, канистры 10 л; продукт и расход — по основанию и техкарте";
  if (n.includes("пароизоляц"))
    return "Предварительно площадь ×1,15, рулоны 30 м²; необходимость и положение слоя определяют по всему пирогу";
  if (n.includes("ветрозащит") || n.includes("гидроветрозащит"))
    return "Предварительно площадь ×1,15, рулоны 30 м²; тип и положение мембраны — по проекту конструкции";
  if (n.includes("скотч") && n.includes("пароизоляц"))
    return "Условная оценка по площади; длину стыков и совместимую ленту калькулятор не запрашивает";
  if (n.includes("брус"))
    return "Предварительно 2,2 пог.м/м² ×1,05; сечение, шаг и несущую схему калькулятор не проектирует";
  if (n.includes("саморез"))
    return "Предварительно 6 шт/м² ×1,10, упаковки 200 шт; крепёж подбирают по основанию и схеме каркаса";
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
    if (product.densityKgM3) parts.push(`${product.densityKgM3} кг/м³ (справочно)`);
  } else if (materialForm === INSULATION_FORM_ROLLS) {
    parts.push("Рулон (размер задайте по этикетке)");
  }
  parts.push(`Слой ${thickness} мм`);
  if (m.packageInfo && m.packageInfo.count > 0) {
    parts.push(
      `${m.packageInfo.count} ${m.packageInfo.packageUnit} × ${m.packageInfo.size} ${m.unit}`,
    );
  }
  if (product) parts.push("сверьте этикетку партии");
  return parts.join(" · ");
}

export interface InsulationMaterialListContext {
  materialForm: number;
  mountSystem: number;
  application: number;
  area: number;
  thickness: number;
  product: InsulationCatalogProduct | null;
}

export function buildMaterialListBanner(ctx: InsulationMaterialListContext): string {
  const { materialForm, mountSystem, application, area, thickness, product } = ctx;
  const productName = product ? `${product.manufacturer} ${product.lineName}` : null;
  const appLabel = applicationMountLabel(application, mountSystem, materialForm);
  const place =
    application === INSULATION_APPLICATION.FACADE
      ? "Фасад"
      : application === INSULATION_APPLICATION.INTERNAL
        ? "Внутренняя стена"
        : application === INSULATION_APPLICATION.ROOF
          ? "Кровля"
          : application === INSULATION_APPLICATION.FLOOR
            ? "Пол / перекрытие"
            : application === INSULATION_APPLICATION.FOUNDATION
              ? "Цоколь / фундамент"
              : "Утепление";

  if (materialForm === INSULATION_FORM_SPRAY) {
    return `${place} · напыляемая эковата · ${area} м² × ${thickness} мм · ${appLabel}`;
  }
  if (materialForm === INSULATION_FORM_ROLLS) {
    return `${place} · рулон · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""} · ${appLabel}`;
  }
  if (mountSystem === 0 && application === INSULATION_APPLICATION.FACADE) {
    const type =
      product?.insulationTypeId === 1
        ? "пеноплекс"
        : product?.insulationTypeId === 2
          ? "пенопласт"
          : "минвата";
    return `${place} · СФТК · ${type} · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""}`;
  }
  return `${place} · ${area} м² × ${thickness} мм${productName ? ` · ${productName}` : ""} · ${appLabel}`;
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
      : companionSubtitle(m) ?? m.subtitle;

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
