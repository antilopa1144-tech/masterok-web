import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalInsulation } from "../../../../engine/insulation";
import insulationSpec from "../../../../configs/calculators/insulation-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";
import {
  checkMineralWoolDensity,
  dowelLengthMm,
  enrichInsulationInputs,
} from "./insulation-inputs";

const insulationManufacturerField = buildManufacturerField("insulation", {
  label: "Производитель и линейка",
  hint: "Выбор линейки автоматически подставит тип утеплителя, размер плиты, число плит в упаковке и плотность. Если не указан — настройте параметры вручную ниже.",
});

export const insulationDef: CalculatorDefinition = {
  id: "insulation",
  slug: "uteplenie",
  title: "Калькулятор утеплителя",
  h1: "Калькулятор утеплителя онлайн — расчёт минваты и пеноплекса",
  description: "Рассчитайте количество утеплителя (минеральная вата, пеноплекс, ППС) для стен, кровли или пола.",
  metaTitle: withSiteMetaTitle("Калькулятор утеплителя онлайн | Расчёт минваты и пеноплекса"),
  metaDescription: "Бесплатный калькулятор утеплителя: рассчитайте минвату, пеноплекс или пенопласт для стен, кровли и пола с учётом площади, толщины слоя и запаса.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["утеплитель", "минвата", "пеноплекс", "пенопласт", "утепление", "теплоизоляция"],
  popularity: 68,
  complexity: 1,
  /**
   * Порядок полей: главное наверх (что выбираем) → детали (как считаем).
   *
   * Когда выбран конкретный производитель (manufacturer > 0), технические
   * поля «Тип утеплителя», «Размер плиты», «Плит в упаковке» скрываются —
   * все эти параметры уже зашиты в линейке бренда и подставляются автоматически
   * в `calculate()` через specs (insulationTypeId, plateSizeId, packPieces).
   *
   * Поля, которые остаются видимыми всегда:
   *  - Площадь — пользовательский ввод
   *  - Производитель — главный выбор
   *  - Толщина — пользователь выбирает сам (от региона/задачи)
   *  - Система монтажа — определяет companion-материалы
   *  - Климатическая зона — для проверки толщины по СП 50.13330
   */
  fields: [
    {
      key: "application",
      label: "Что утепляем",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Фасад снаружи (стены дома)" },
        { value: 1, label: "Внутренняя стена / лоджия / квартира" },
        { value: 2, label: "Кровля или мансарда" },
        { value: 3, label: "Пол или перекрытие" },
        { value: 4, label: "Цоколь или фундамент" },
      ],
      hint: "От назначения зависят рекомендуемый тип утеплителя, плотность, нужны ли мембраны и крепёж. Например, для фасада нужна плотная минвата 80 кг/м³ или ЭППС; для квартиры подойдёт минвата 35-45 кг/м³ + пароизоляция изнутри.",
    },
    {
      key: "area",
      label: "Площадь утепления",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "reserve",
      label: "Запас на подрезку",
      type: "slider",
      unit: "%",
      min: 0,
      max: 15,
      step: 1,
      defaultValue: 5,
      hint: "5% — норма для плит; 10–15% — сложная геометрия или много углов.",
    },
    ...(insulationManufacturerField ? [insulationManufacturerField] : []),
    {
      key: "insulationType",
      label: "Тип утеплителя",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Минеральная вата (плиты)" },
        { value: 1, label: "Пеноплекс/ЭППС (плиты)" },
        { value: 2, label: "Пенопласт ППС (плиты)" },
        { value: 3, label: "Эковата (напыление)" },
      ],
      hideIf: { key: "manufacturer", op: "gt", value: 0 },
    },
    {
      key: "thickness",
      label: "Толщина утеплителя",
      type: "select",
      defaultValue: 100,
      options: [
        { value: 50, label: "50 мм (Юг)" },
        { value: 80, label: "80 мм (Юг)" },
        { value: 100, label: "100 мм (Центр, минимум)" },
        { value: 150, label: "150 мм (Центр–Урал, рекомендация)" },
        { value: 200, label: "200 мм (Сибирь)" },
        { value: 250, label: "250 мм (Крайний Север)" },
        { value: 300, label: "300 мм (Крайний Север, рекомендация)" },
      ],
      // Если выбрана конкретная линейка бренда — заменяем опции на те, которые
      // эта линейка реально выпускает (specs.thicknessOptions). Например,
      // у Пеноплэкс Комфорт это [20, 30, 50, 100] — пользователь не сможет
      // выбрать 80 мм или 150 мм, которых у этого продукта нет.
      optionsFromBrand: {
        category: "insulation",
        specKey: "thicknessOptions",
        labelTemplate: "%v мм",
      },
    },
    {
      key: "plateSize",
      label: "Размер плиты",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×600 мм (Rockwool, Knauf)" },
        { value: 1, label: "1000×500 мм (Технониколь)" },
        { value: 2, label: "2000×1000 мм (крупноформатный ЭППС)" },
        { value: 3, label: "1185×585 мм (Пеноплэкс, Технониколь XPS)" },
      ],
      hideIf: { key: "manufacturer", op: "gt", value: 0 },
    },
    {
      key: "mountSystem",
      label: "Система монтажа",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Мокрый штукатурный фасад (СФТК)" },
        { value: 1, label: "Каркасная система / вентфасад" },
      ],
      hint: "Для внутренних стен, кровли и пола калькулятор автоматически выберет каркасную систему. СФТК — для наружного фасада и цоколя с облицовкой.",
    },
    {
      key: "layerScheme",
      label: "Схема укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "В один слой" },
        { value: 1, label: "В два слоя со смещением стыков" },
      ],
      hint: "Для толщин ≥ 150 мм по СП 23-101-2004 рекомендуется укладка в два слоя со смещением стыков на 1/2 плиты — это устраняет мостики холода. Калькулятор автоматически подберёт толщины слоёв (например, 200 мм = 100+100, 150 мм = 50+100).",
    },
    {
      key: "density",
      label: "Плотность минваты",
      type: "select",
      defaultValue: 80,
      options: [
        { value: 35, label: "35 кг/м³ — каркас, кровля (бюджетная)" },
        { value: 45, label: "45 кг/м³ — звукоизоляция, перегородки (только каркас)" },
        { value: 80, label: "80 кг/м³ — мокрый штукатурный фасад (СФТК)" },
        { value: 100, label: "100 кг/м³ — вентфасад под облицовку" },
        { value: 150, label: "150 кг/м³ — кровля под стяжку, пол" },
      ],
      hint: "Плотность определяет применение и цену. Для каркаса хватит 35 кг/м³, для штукатурного фасада нужно минимум 80, для пола под стяжку — 150. Если выбрана линейка бренда — плотность подставится из неё автоматически (выбор тут будет проигнорирован).",
      // Прячем только для типов утеплителя где плотность не применима
      // (ЭППС, ППС, эковата — у них плотность стандартная). Для минваты
      // показываем всегда: и без бренда (выбор пользователя), и с брендом
      // (информативно — пользователь видит плотность линейки, см. hint).
      hideIf: [
        { key: "insulationType", op: "ne", value: 0 },
      ],
    },
    {
      key: "piecesPerPack",
      label: "Плит в упаковке",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Авто — по толщине и типу" },
        { value: 4, label: "4 шт (минвата 150 мм / ЭППС 100 мм)" },
        { value: 5, label: "5 шт (ППС 100 мм)" },
        { value: 6, label: "6 шт (минвата 100 мм)" },
        { value: 8, label: "8 шт (ЭППС 50 мм)" },
        { value: 10, label: "10 шт (ППС 50 мм)" },
        { value: 12, label: "12 шт (минвата 50 мм)" },
      ],
      hint: "По умолчанию калькулятор сам подбирает упаковку по толщине: для минваты ~600 мм / толщина, для ЭППС ~400 мм / толщина. Если на пачке указано другое — выберите вручную.",
      hideIf: { key: "manufacturer", op: "gt", value: 0 },
    },
    {
      key: "climateZone",
      label: "Климатическая зона (СП 50.13330)",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Юг — Краснодар, Сочи, Крым, Ростов" },
        { value: 1, label: "Центр — Москва, СПб, Поволжье" },
        { value: 2, label: "Урал, Северо-Запад" },
        { value: 3, label: "Сибирь — Новосибирск, Иркутск, Красноярск" },
        { value: 4, label: "Крайний Север — Якутск, Норильск, Мурманск" },
      ],
      hint: "Калькулятор проверит толщину утепления по нормам СП 50.13330 для вашего региона и подскажет если её мало.",
    },
  ],
  calculate(inputs) {
    const spec = insulationSpec as any;
    const factorTable = defaultFactorTables.factors as any;

    const manufacturer = getManufacturerByIndex("insulation", inputs.manufacturer);
    const { enriched: enrichedFromApp, warnings: applicationWarnings } = enrichInsulationInputs(
      inputs as Record<string, unknown>,
      !!manufacturer,
    );
    const enrichedInputs: Record<string, unknown> = {
      ...enrichedFromApp,
      accuracyMode: inputs.accuracyMode,
    };
    const brandWarnings: string[] = [...applicationWarnings];

    /**
     * Подстановка specs выбранного бренда в inputs перед расчётом.
     *
     * Бренд задаёт реальные параметры линейки: тип утеплителя, размер плиты,
     * число плит в пачке для конкретной толщины, плотность. Это переопределяет
     * соответствующие input-значения и даёт точный результат для конкретного
     * продукта (например, Rockwool Лайт Баттс 100мм = 6шт/пачка ≠ Knauf TS 037
     * у которого тоже 6шт, но размер плиты 1230×610 ≠ 1200×600).
     *
     * Приоритет: пользователь явно меняет input → бренд override срабатывает
     * до движка → если толщина не из линейки, добавляем warning.
     */
    if (manufacturer) {
      const s = manufacturer.specs as Record<string, unknown>;

      if (typeof s.insulationTypeId === "number") {
        enrichedInputs.insulationType = s.insulationTypeId;
      }
      if (typeof s.plateSizeId === "number") {
        enrichedInputs.plateSize = s.plateSizeId;
      }
      if (typeof s.plateAreaM2 === "number" && Number(s.plateAreaM2) > 0) {
        enrichedInputs.plateAreaM2 = s.plateAreaM2;
      }

      const thickness = Number(enrichedInputs.thickness ?? inputs.thickness ?? 100);
      const thicknessOptions = Array.isArray(s.thicknessOptions) ? (s.thicknessOptions as number[]) : null;
      if (thicknessOptions && thicknessOptions.length > 0 && !thicknessOptions.includes(thickness)) {
        brandWarnings.push(
          `Для линейки «${manufacturer.name}» доступны толщины: ${thicknessOptions.join(", ")} мм. ` +
          `Введённая толщина ${thickness} мм не выпускается этим производителем — расчёт упаковок будет приблизительным.`,
        );
      }

      const packPieces = (s.packPieces ?? null) as Record<string, number> | null;
      if (packPieces && packPieces[String(thickness)] !== undefined) {
        // Бренд задаёт точное число плит в пачке для этой толщины.
        // Пользовательский override (явный piecesPerPack > 0) имеет приоритет.
        const userOverride = Number(inputs.piecesPerPack ?? 0);
        if (!userOverride || userOverride <= 0) {
          enrichedInputs.piecesPerPack = packPieces[String(thickness)];
        }
      }
    }

    /**
     * Двухслойная укладка (layerScheme=1).
     *
     * По СП 23-101-2004 при толщине утепления ≥ 150 мм рекомендуется укладка
     * в два слоя со смещением стыков на 1/2 плиты — это устраняет мостики
     * холода по швам между плитами. Толщины слоёв берём из стандартной карты.
     *
     * Реализация: вызываем движок дважды (для t1 и t2). Основной материал
     * — две позиции с разной толщиной. Companion-материалы (мембрана, клей,
     * сетка, штукатурка) одинаковые для обоих — берём из первого расчёта.
     * Дюбели берём из любого, но переименовываем чтобы напомнить пользователю
     * заказать более длинные (по полной толщине + основание).
     */
    const LAYER_SPLIT: Record<number, [number, number]> = {
      100: [50, 50],
      150: [50, 100],
      200: [100, 100],
      250: [100, 150],
      300: [150, 150],
    };
    const baseThickness = Number(enrichedInputs.thickness ?? inputs.thickness ?? 100);
    const userScheme = Math.round(Number(inputs.layerScheme ?? 0));
    const split = userScheme === 1 ? LAYER_SPLIT[baseThickness] : undefined;
    const isTwoLayer = userScheme === 1 && !!split;

    let canonical = computeCanonicalInsulation(
      spec,
      enrichedInputs as Parameters<typeof computeCanonicalInsulation>[1],
      factorTable,
    );

    if (isTwoLayer && split) {
      const [t1, t2] = split;
      // Считаем оба слоя; для каждого свои упаковки и плиты.
      // brand packPieces зависит от толщины — переопределяем piecesPerPack=0
      // (авто-расчёт по слою) если бренд не задал явное значение для слоя.
      function calcLayer(layerThickness: number) {
        const layerInputs: Record<string, unknown> = { ...enrichedInputs, thickness: layerThickness };
        if (manufacturer) {
          const packPieces = (manufacturer.specs as Record<string, unknown>).packPieces as Record<string, number> | undefined;
          if (packPieces && packPieces[String(layerThickness)] !== undefined) {
            layerInputs.piecesPerPack = packPieces[String(layerThickness)];
          } else {
            // Бренд не выпускает эту толщину или packPieces не задан —
            // даём авто-расчёт от pack_height_mm.
            layerInputs.piecesPerPack = 0;
          }
        }
        return computeCanonicalInsulation(
          spec,
          layerInputs as Parameters<typeof computeCanonicalInsulation>[1],
          factorTable,
        );
      }
      const layerA = calcLayer(t1);
      const layerB = calcLayer(t2);

      // Слияние материалов:
      //  - две позиции «Основное» (плиты разной толщины)
      //  - дюбели — из layerB (с пометкой про длину)
      //  - всё остальное — из layerA (это companion, они одинаковые)
      const layerAMain = layerA.materials.find((m) => m.category === "Основное");
      const layerBMain = layerB.materials.find((m) => m.category === "Основное");
      const layerADowels = layerA.materials.find((m) => m.name.includes("Дюбели"));
      const otherCompanions = layerA.materials.filter(
        (m) => m.category !== "Основное" && !m.name.includes("Дюбели"),
      );
      const merged: typeof canonical.materials = [];
      if (layerAMain) merged.push({ ...layerAMain, name: `Слой 1 — ${layerAMain.name}` });
      if (layerBMain) merged.push({ ...layerBMain, name: `Слой 2 — ${layerBMain.name}` });
      if (layerADowels) {
        const totalThickness = t1 + t2;
        const dowelLen = dowelLengthMm(totalThickness);
        merged.push({
          ...layerADowels,
          name: `Дюбели тарельчатые 10×${dowelLen} мм (сквозные, ${totalThickness} мм утепления)`,
        });
      }
      merged.push(...otherCompanions);

      canonical = {
        ...canonical,
        materials: merged,
        practicalNotes: [
          ...(canonical.practicalNotes ?? []),
          `Двухслойная укладка: ${t1}+${t2} мм. Верхний слой укладывается со смещением стыков на 1/2 плиты — это устраняет мостики холода по швам (СП 23-101-2004).`,
        ],
      };
    }

    const materials = manufacturer
      ? canonical.materials.map((m) =>
          m.category === "Основное" || /утепл|вата|пеноплекс|плит/i.test(m.name)
            ? { ...m, name: `${m.name} — ${manufacturer.name}` }
            : m
        )
      : canonical.materials;

    // Сохраняем плотность бренда в totals для отображения (если есть).
    const totals: Record<string, number> = { ...canonical.totals };
    if (manufacturer) {
      const density = (manufacturer.specs as Record<string, unknown>).density;
      if (typeof density === "number" && density > 0) {
        totals.brandDensity = density;
      }
    }

    const insulationType = Number(enrichedInputs.insulationType ?? inputs.insulationType ?? 0);
    const mountSystem = Number(enrichedInputs.mountSystem ?? inputs.mountSystem ?? 0);
    let effectiveDensity = 0;
    if (manufacturer) {
      effectiveDensity = Number((manufacturer.specs as Record<string, unknown>).density ?? 0);
    } else if (insulationType === 0) {
      effectiveDensity = Number(enrichedInputs.density ?? inputs.density ?? 80);
    }

    if (insulationType === 0 && effectiveDensity > 0) {
      totals.effectiveDensity = effectiveDensity;
      const densityCheck = checkMineralWoolDensity(effectiveDensity, mountSystem);
      brandWarnings.push(...densityCheck.warnings);
      if (densityCheck.practicalNotes.length > 0) {
        canonical.practicalNotes = [
          ...(canonical.practicalNotes ?? []),
          ...densityCheck.practicalNotes,
        ];
      }
    }

    /**
     * Справочное сравнение стоимости типов утеплителя.
     *
     * Для текущей площади и толщины показываем примерную стоимость материала
     * по каждому типу. Это даёт пользователю ориентир: «у меня в задаче минвата
     * выйдет ~16 000 ₽, ЭППС ~34 000 ₽, ППС ~9 000 ₽».
     *
     * Цены — усреднённые рыночные значения 2026 года; делим/умножаем линейно
     * по толщине. Для минваты применяем коэффициент плотности (плотная дороже
     * лёгкой ~в 2 раза). Накладные расходы, доставку и работу не учитываем.
     */
    const area = Number(inputs.area ?? 0);
    const thickness = Number(inputs.thickness ?? 100);
    const types = spec.normative_formula?.insulation_types as Array<Record<string, unknown>> | undefined;
    if (area > 0 && thickness > 0 && types && types.length > 0) {
      const densityPresets = (spec.normative_formula?.density_presets ?? []) as Array<{
        value: number;
        cost_multiplier: number;
      }>;
      // Поправка цены для минваты по выбранной плотности.
      const densityCostMult = (() => {
        if (effectiveDensity <= 0 || densityPresets.length === 0) return 1;
        const closest = densityPresets.reduce<typeof densityPresets[number] | null>((best, p) => {
          if (!best) return p;
          return Math.abs(p.value - effectiveDensity) < Math.abs(best.value - effectiveDensity) ? p : best;
        }, null);
        return closest?.cost_multiplier ?? 1;
      })();

      const lines: string[] = [];
      lines.push(`Примерная стоимость материала для ${area} м² × ${thickness} мм (справочно, рынок РФ 2026):`);
      for (const t of types) {
        const base = Number(t.cost_estimate_per_m2_at_100mm_rub ?? 0);
        if (!(base > 0)) continue;
        // Поправка плотности применяется только к минвате (тип 0).
        const tId = Number(t.id ?? -1);
        const mult = tId === 0 ? densityCostMult : 1;
        const totalRub = area * base * mult * (thickness / 100);
        // Округляем до сотен рублей, добавляем разделитель тысяч
        const rounded = Math.round(totalRub / 100) * 100;
        const formatted = rounded.toLocaleString("ru-RU");
        const densityNote = tId === 0 && effectiveDensity > 0 ? ` (плотность ${effectiveDensity} кг/м³)` : "";
        lines.push(`• ${t.label}${densityNote}: ~${formatted} ₽`);
      }
      lines.push("Цены без работы и доставки, могут заметно меняться по регионам и брендам.");
      canonical.practicalNotes = [...(canonical.practicalNotes ?? []), lines.join("\n")];
    }

    /**
     * 3 главные карточки результата, специфичные для утеплителя.
     *
     * Меняем стандартный набор «Всего материалов / Площадь / Плит» на:
     *  1. К покупке — упаковки (понятно сколько идти за товаром)
     *  2. Стоимость — примерная сумма по типу+плотности
     *  3. На задачу — площадь × толщина + плотность/бренд (контекст)
     */
    const summaryCards: import("../types").SummaryCard[] = (() => {
      // Для двухслойной укладки в `materials` две позиции «Основное» — суммируем.
      const mainMats = materials.filter((m) => m.category === "Основное");
      const totalPacks = mainMats.reduce((s, m) => s + (m.packageInfo?.count ?? 0), 0);
      const packUnit = mainMats[0]?.packageInfo?.packageUnit ?? "упаковок";
      const piecesPerPack = mainMats[0]?.packageInfo?.size ?? 0;
      const totalPieces = mainMats.reduce((s, m) => s + (m.purchaseQty ?? 0), 0);
      const matUnit = mainMats[0]?.unit ?? "шт";

      // Карточка 1: к покупке. Если есть упаковки — показываем их.
      const card1: import("../types").SummaryCard = totalPacks > 0
        ? {
            icon: "📦",
            label: "К покупке",
            value: String(totalPacks),
            unit: packUnit,
            hint: manufacturer
              ? manufacturer.name
              : `по ${piecesPerPack} ${matUnit} в упак. — ${totalPieces} ${matUnit} всего`,
            tone: "violet",
          }
        : {
            icon: "📦",
            label: "К покупке",
            value: String(totalPieces),
            unit: matUnit,
            hint: manufacturer ? manufacturer.name : "основной материал",
            tone: "violet",
          };

      // Карточка 2: стоимость (если посчитали).
      // Берём из practicalNotes — мы уже округлили до сотен.
      // Альтернативно — считаем заново здесь от выбранного типа.
      let costStr = "—";
      let costHint = "";
      if (area > 0 && thickness > 0) {
        const insType = Number(enrichedInputs.insulationType ?? inputs.insulationType ?? 0);
        const types = spec.normative_formula?.insulation_types as Array<Record<string, unknown>> | undefined;
        const t = types?.find((x) => Number(x.id) === insType);
        const base = Number(t?.cost_estimate_per_m2_at_100mm_rub ?? 0);
        if (base > 0) {
          const densityPresets = (spec.normative_formula?.density_presets ?? []) as Array<{ value: number; cost_multiplier: number }>;
          let densityMult = 1;
          if (insType === 0 && effectiveDensity > 0 && densityPresets.length > 0) {
            const closest = densityPresets.reduce<typeof densityPresets[number] | null>((best, p) => {
              if (!best) return p;
              return Math.abs(p.value - effectiveDensity) < Math.abs(best.value - effectiveDensity) ? p : best;
            }, null);
            densityMult = closest?.cost_multiplier ?? 1;
          }
          const totalRub = area * base * densityMult * (thickness / 100);
          const rounded = Math.round(totalRub / 100) * 100;
          costStr = `~${rounded.toLocaleString("ru-RU")}`;
          if (totalPacks > 0) {
            const perPack = Math.round(rounded / totalPacks);
            costHint = `~${perPack.toLocaleString("ru-RU")} ₽ за упаковку`;
          } else {
            costHint = "справочно, 2026";
          }
        }
      }
      const card2: import("../types").SummaryCard = {
        icon: "💰",
        label: "Примерная стоимость",
        value: costStr,
        unit: "₽",
        hint: costHint,
        tone: "emerald",
      };

      // Карточка 3: контекст задачи.
      const layerHint = Number(inputs.layerScheme ?? 0) === 1 ? " (в два слоя)" : "";
      const densityHint = effectiveDensity > 0 ? `плотность ${effectiveDensity} кг/м³` : "";
      const card3: import("../types").SummaryCard = {
        icon: "📐",
        label: "На задачу",
        value: `${area} м² × ${thickness}`,
        unit: "мм",
        hint: `${densityHint}${layerHint}`,
        tone: "slate",
      };

      return [card1, card2, card3];
    })();

    return {
      materials,
      totals,
      warnings: [...brandWarnings, ...canonical.warnings],
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      summaryCards,
    };
  },
  formulaDescription: `
**Расчёт утеплителя:**
Плит = упаковка по сценарию REC: ⌈(Площадь × (1 + Запас%)) / S_плиты⌉, округление до целых упаковок.

Стандартные размеры плит:
- Минвата Knauf/Rockwool: 1200×600 мм = 0,72 м²
- Пеноплэкс / Технониколь XPS: 1185×585 мм = 0,693 м²
- Пенопласт ППС: 1000×500 мм = 0,5 м²

**Дюбели (только СФТК):** минвата 7 шт/м², ЭППС 5, ППС 6 (+5% запас). Длина: толщина + 50 мм в основание.

**Сопутствующие материалы** зависят от назначения и системы монтажа:
| Материал                  | СФТК (фасад, цоколь) | Каркас / вентфасад |
|---------------------------|----------------------|---------------------|
| Клей фасадный 5 кг/м²     | да                   | нет                 |
| Дюбели тарельчатые        | да                   | нет                 |
| Стеклосетка, штукатурка   | да                   | нет                 |
| Грунтовка                 | да                   | нет                 |
| Пароизоляция              | нет                  | да (минвата)        |
| Гидроветрозащита          | нет                  | да (минвата, эковата) |
| Брус каркаса              | нет                  | да                  |

Для внутренних стен, кровли и пола калькулятор переключает каркасную систему автоматически.
  `,
  howToUse: [
    "Введите площадь утепляемой поверхности",
    "Выберите тип утеплителя",
    "Укажите толщину (для большинства регионов России — 100–150 мм)",
    "Выберите размер плиты (указан на упаковке)",
    "Выберите систему монтажа — от неё зависят сопутствующие материалы: для мокрого фасада клей, дюбели, сетка и штукатурка; для каркасной — брус, ветрозащита и пароизоляция",
    "Нажмите «Рассчитать» — получите плиты, дюбели и сопутствующие материалы",
  ],
faq: [
    {
      question: "Как выбрать толщину утеплителя для дома?",
      answer:
        "По теплотехнике для вашего климатического региона и пирога стены или кровли (СП 50). Частые ориентиры для центра России — порядка 100–150 мм для стен, но узел каждый раз свой.",
    },
    {
      question: "Сколько дюбелей нужно для утеплителя?",
      answer:
        "В расчёте заложены нормы спецификации: минвата 7 шт/м², ЭППС 5, ЕПС 6 (эковата без дюбелей) плюс запас. Углы, кромки и проёмы в реале загущают по схеме системы.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта утеплителя</h2>
<p>Количество плит утеплителя рассчитывается по формуле:</p>
<p><strong>N = &lceil;S &times; K<sub>запас</sub> / S<sub>плиты</sub>&rceil;</strong></p>
<ul>
  <li><strong>N</strong> — количество плит</li>
  <li><strong>S</strong> — площадь утепления (м&sup2;)</li>
  <li><strong>K<sub>запас</sub></strong> — запас на подрезку (по умолчанию 5%, настраивается)</li>
  <li><strong>S<sub>плиты</sub></strong> — площадь одной плиты (м&sup2;)</li>
</ul>
<p>Количество дюбелей-зонтиков (только СФТК):</p>
<p><strong>D = &lceil;S &times; N &times; 1,05&rceil;</strong>, N = 7 (минвата), 5 (ЭППС), 6 (ППС) шт/м&sup2;</p>

<h2>Размеры плит и площадь покрытия</h2>
<table>
  <thead>
    <tr><th>Утеплитель</th><th>Размер плиты, мм</th><th>Площадь, м&sup2;</th><th>В упаковке</th></tr>
  </thead>
  <tbody>
    <tr><td>Rockwool Фасад Баттс</td><td>1200&times;600</td><td>0.72</td><td>4 шт = 2.88 м&sup2;</td></tr>
    <tr><td>Knauf Insulation</td><td>1200&times;600</td><td>0.72</td><td>8 шт = 5.76 м&sup2;</td></tr>
    <tr><td>Технониколь XPS / Пеноплэкс</td><td>1185&times;585</td><td>0.693</td><td>4–8 шт в упаковке</td></tr>
    <tr><td>Крупноформатный ЭППС</td><td>2000&times;1000</td><td>2.00</td><td>4 шт = 8.00 м&sup2;</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Теплозащита зданий регламентируется <strong>СП 50.13330.2012</strong> «Тепловая защита зданий» (актуализированная редакция СНиП 23-02-2003). Стандарт определяет требуемое сопротивление теплопередаче ограждающих конструкций в зависимости от климатической зоны. Для большинства регионов центральной России толщина утеплителя стен составляет <strong>100–150 мм</strong>.</p>

<h2>Рекомендуемая толщина по регионам</h2>
<ul>
  <li><strong>50–80 мм</strong> — южные регионы (Краснодар, Ростов)</li>
  <li><strong>100 мм</strong> — центральная Россия (Москва, Воронеж)</li>
  <li><strong>150 мм</strong> — Урал, Западная Сибирь (Екатеринбург, Новосибирск)</li>
  <li><strong>200 мм</strong> — крайний север (Якутск, Норильск)</li>
</ul>
`,
    faq: [
      {
        question: "Сколько плит утеплителя нужно на 100 м²?",
        answer: "<p>Для минваты 1200&times;600 мм (0.72 м&sup2;/плита) при запасе 5%: &lceil;105 / 0.72&rceil; = <strong>146 плит</strong> (округление до упаковок — в калькуляторе).</p><p>Дюбели (минвата, СФТК): &lceil;100 &times; 7 &times; 1,05&rceil; = <strong>735 штук</strong>, длина 150 мм при слое 100 мм.</p>",
      },
      {
        question: "Минвата или пеноплекс — что лучше для утепления?",
        answer: "<p>Выбор зависит от конструкции и условий:</p><table><thead><tr><th>Параметр</th><th>Минвата</th><th>Пеноплекс (ЭППС)</th></tr></thead><tbody><tr><td>Паропроницаемость</td><td>Высокая (стены дышат)</td><td>Почти нулевая</td></tr><tr><td>Влагопоглощение</td><td>Впитывает (нужна мембрана)</td><td>Не впитывает</td></tr><tr><td>Горючесть</td><td>НГ (негорючий)</td><td>Г3–Г4 (горючий)</td></tr><tr><td>Теплопроводность</td><td>0.035–0.045 Вт/м&middot;К</td><td>0.028–0.034 Вт/м&middot;К</td></tr></tbody></table><p><strong>Минвата</strong> — фасады, стены, кровли (паропроницаемость + негорючесть). <strong>Пеноплекс</strong> — цоколь, фундамент, отмостка (влагостойкость).</p>",
      },
      {
        question: "Сколько дюбелей-зонтиков нужно на 1 м² утеплителя?",
        answer: "<p>В калькуляторе заложены нормы: <strong>минвата 7 шт/м&sup2;</strong>, ЭППС 5, ППС 6 (+5% запас). На объекте углы и проёмы загущают до 8–10 шт/м&sup2;.</p><p>Длина дюбеля: <strong>толщина утеплителя + 50 мм</strong> в несущее основание. Для слоя 100 мм — дюбели <strong>150 мм</strong>.</p>",
      },
    ],
  },
};


