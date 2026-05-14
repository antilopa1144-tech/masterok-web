import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalInsulation } from "../../../../engine/insulation";
import insulationSpec from "../../../../configs/calculators/insulation-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const insulationManufacturerField = buildManufacturerField("insulation");

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
  fields: [
    {
      key: "area",
      label: "Площадь утепления",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 50,
    },
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
    },
    {
      key: "plateSize",
      label: "Размер плиты",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "1200×600 мм (Rockwool, Knauf)" },
        { value: 1, label: "1000×500 мм (Технониколь)" },
        { value: 2, label: "2000×1000 мм (пеноплекс стандарт)" },
      ],
    },
    {
      key: "mountSystem",
      label: "Система монтажа",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Мокрый штукатурный фасад" },
        { value: 1, label: "Каркасная система / вентфасад" },
      ],
      hint: "В мокром фасаде нужны клей, дюбели, сетка и штукатурка. В каркасной — брус, ветрозащита и пароизоляция, но не нужны клей с дюбелями.",
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
    ...(insulationManufacturerField ? [insulationManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = insulationSpec as any;
    const factorTable = defaultFactorTables.factors as any;

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
    const manufacturer = getManufacturerByIndex("insulation", inputs.manufacturer);
    const enrichedInputs: Record<string, unknown> = { ...inputs, accuracyMode: inputs.accuracyMode };
    const brandWarnings: string[] = [];

    if (manufacturer) {
      const s = manufacturer.specs as Record<string, unknown>;

      if (typeof s.insulationTypeId === "number") {
        enrichedInputs.insulationType = s.insulationTypeId;
      }
      if (typeof s.plateSizeId === "number") {
        enrichedInputs.plateSize = s.plateSizeId;
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

    const canonical = computeCanonicalInsulation(spec, enrichedInputs as Parameters<typeof computeCanonicalInsulation>[1], factorTable);

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

    /**
     * Справочное сравнение стоимости типов утеплителя.
     *
     * Для текущей площади и толщины показываем примерную стоимость материала
     * по каждому типу. Это даёт пользователю ориентир: «у меня в задаче минвата
     * выйдет ~16 000 ₽, ЭППС ~34 000 ₽, ППС ~9 000 ₽».
     *
     * Цены — усреднённые рыночные значения 2026 года; делим/умножаем линейно
     * по толщине. Накладные расходы, доставку и работу не учитываем.
     */
    const area = Number(inputs.area ?? 0);
    const thickness = Number(inputs.thickness ?? 100);
    const types = spec.normative_formula?.insulation_types as Array<Record<string, unknown>> | undefined;
    if (area > 0 && thickness > 0 && types && types.length > 0) {
      const lines: string[] = [];
      lines.push(`Примерная стоимость материала для ${area} м² × ${thickness} мм (справочно, рынок РФ 2026):`);
      for (const t of types) {
        const base = Number(t.cost_estimate_per_m2_at_100mm_rub ?? 0);
        if (!(base > 0)) continue;
        const totalRub = area * base * (thickness / 100);
        // Округляем до сотен рублей, добавляем разделитель тысяч
        const rounded = Math.round(totalRub / 100) * 100;
        const formatted = rounded.toLocaleString("ru-RU");
        lines.push(`• ${t.label}: ~${formatted} ₽`);
      }
      lines.push("Цены без работы и доставки, могут заметно меняться по регионам и брендам.");
      canonical.practicalNotes = [...(canonical.practicalNotes ?? []), lines.join("\n")];
    }

    return {
      materials,
      totals,
      warnings: [...brandWarnings, ...canonical.warnings],
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
    };
  },
  formulaDescription: `
**Расчёт утеплителя:**
Плит = ⌈Площадь × 1.05 / Площадь_плиты⌉

Стандартные размеры плит:
- Минвата Knauf/Rockwool: 1200×600 мм = 0.72 м²
- Пеноплекс: 1200×600 или 2000×1000 мм
- Пенопласт ППС: 1000×500 мм = 0.5 м²

Нормы крепления: 5–8 дюблей-зонтиков на 1 м²
Запас 5% на подрезку

**Сопутствующие материалы зависят от системы монтажа:**
| Материал                  | Мокрый штукатурный фасад | Каркасная система |
|---------------------------|--------------------------|-------------------|
| Клей фасадный             | да (5 кг/м²)             | нет               |
| Дюбели тарельчатые        | да                       | нет (плита враспор) |
| Стеклосетка армирующая    | да                       | нет               |
| Базовая штукатурка        | да (5 кг/м²)             | нет               |
| Грунтовка фасадная        | да                       | нет               |
| Пароизоляционная мембрана | нет                      | да (для минваты)  |
| Гидроветрозащитная плёнка | нет                      | да (для минваты)  |
| Брус каркаса 50×50        | нет                      | да (~2.2 пог.м/м²) |

Гидроветрозащита для минваты добавляется в обеих системах.
Для эковаты грунтовка не нужна — её задувают в готовый каркас.
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
  <li><strong>K<sub>запас</sub></strong> — коэффициент запаса 1.05 (5% на подрезку)</li>
  <li><strong>S<sub>плиты</sub></strong> — площадь одной плиты (м&sup2;)</li>
</ul>
<p>Количество дюбелей-зонтиков:</p>
<p><strong>D = S &times; 6</strong> (6 штук на 1 м&sup2; — стандартная схема крепления)</p>

<h2>Размеры плит и площадь покрытия</h2>
<table>
  <thead>
    <tr><th>Утеплитель</th><th>Размер плиты, мм</th><th>Площадь, м&sup2;</th><th>В упаковке</th></tr>
  </thead>
  <tbody>
    <tr><td>Rockwool Фасад Баттс</td><td>1200&times;600</td><td>0.72</td><td>4 шт = 2.88 м&sup2;</td></tr>
    <tr><td>Knauf Insulation</td><td>1200&times;600</td><td>0.72</td><td>8 шт = 5.76 м&sup2;</td></tr>
    <tr><td>Технониколь XPS</td><td>1200&times;600</td><td>0.72</td><td>4 шт = 2.88 м&sup2;</td></tr>
    <tr><td>Пеноплекс Комфорт</td><td>2000&times;1000</td><td>2.00</td><td>4 шт = 8.00 м&sup2;</td></tr>
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
        answer: "<p>Количество плит зависит от размера. Для стандартной минваты 1200&times;600 мм (0.72 м&sup2;/плита):</p><p>N = &lceil;100 &times; 1.05 / 0.72&rceil; = <strong>146 плит</strong></p><p>Упаковок (8 шт/уп): &lceil;146 / 8&rceil; = <strong>19 упаковок</strong></p><p>Для пеноплекса 2000&times;1000 мм (2.0 м&sup2;/плита):</p><p>N = &lceil;100 &times; 1.05 / 2.0&rceil; = <strong>53 плиты</strong> = <strong>14 упаковок</strong> (4 шт/уп)</p><p>Дюбелей-зонтиков: 100 &times; 6 = <strong>600 штук</strong>.</p>",
      },
      {
        question: "Минвата или пеноплекс — что лучше для утепления?",
        answer: "<p>Выбор зависит от конструкции и условий:</p><table><thead><tr><th>Параметр</th><th>Минвата</th><th>Пеноплекс (ЭППС)</th></tr></thead><tbody><tr><td>Паропроницаемость</td><td>Высокая (стены дышат)</td><td>Почти нулевая</td></tr><tr><td>Влагопоглощение</td><td>Впитывает (нужна мембрана)</td><td>Не впитывает</td></tr><tr><td>Горючесть</td><td>НГ (негорючий)</td><td>Г3–Г4 (горючий)</td></tr><tr><td>Теплопроводность</td><td>0.035–0.045 Вт/м&middot;К</td><td>0.028–0.034 Вт/м&middot;К</td></tr></tbody></table><p><strong>Минвата</strong> — фасады, стены, кровли (паропроницаемость + негорючесть). <strong>Пеноплекс</strong> — цоколь, фундамент, отмостка (влагостойкость).</p>",
      },
      {
        question: "Сколько дюбелей-зонтиков нужно на 1 м² утеплителя?",
        answer: "<p>Стандартная норма — <strong>5–8 дюбелей на 1 м&sup2;</strong>, но расход зависит от зоны фасада:</p><ul><li><strong>Центральное поле стены</strong> — 5–6 шт/м&sup2;</li><li><strong>Углы здания</strong> (1 м от угла) — 8 шт/м&sup2;</li><li><strong>Зоны у проёмов</strong> — 8 шт/м&sup2;</li><li><strong>Верхний пояс</strong> (у парапета) — 8–10 шт/м&sup2;</li></ul><p>Длина дюбеля: <strong>толщина утеплителя + 50 мм</strong> (заглубление в основание). Для утеплителя 100 мм нужны дюбели <strong>150–160 мм</strong>.</p>",
      },
    ],
  },
};


