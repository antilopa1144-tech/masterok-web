import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import factorTables from "../../../../configs/factor-tables.json";
import tileCanonicalSpecJson from "../../../../configs/calculators/tile-canonical.v1.json";
import { computeCanonicalTile } from "../../../../engine/tile";
import type { TileCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const tileCanonicalSpec = tileCanonicalSpecJson as TileCanonicalSpec;
const tileManufacturerField = buildManufacturerField("tile", {
  hint: "Выбор добавляет бренд только к названию основной плитки. Формат, фасовку, калибр и характеристики конкретного артикула введите и проверьте отдельно.",
});

function mapLegacyMethodToCanonical(layingMethod: number | undefined): number {
  switch (Math.round(layingMethod ?? 0)) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    default:
      return 1;
  }
}

function mapLegacyComplexityToCanonical(roomComplexity: number | undefined): number {
  return Math.max(1, Math.min(3, Math.round(roomComplexity ?? 0) + 1));
}

export const tileDef: CalculatorDefinition = {
  id: "tile",
  slug: "plitka",
  formulaVersion: tileCanonicalSpec.formula_version,
  title: "Калькулятор плитки",
  h1: "Калькулятор плитки онлайн — расчёт количества плитки и клея",
  description: "Рассчитайте количество плитки, клея и затирки для пола и стен. Учёт способа укладки, отходов и размера плитки.",
  metaTitle: withSiteMetaTitle("Калькулятор плитки: расчёт материалов онлайн"),
  metaDescription: "Бесплатный калькулятор плитки: рассчитайте плитку, клей и затирку для пола или стен с учётом схемы укладки, швов и запаса на подрезку.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плитка", "кафель", "керамика", "плиточный клей", "затирка", "ванная", "кухня"],
  popularity: 88,
  complexity: 2,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам комнаты" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина участка облицовки",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина участка облицовки",
      type: "slider",
      unit: "м",
      min: 0.5,
      max: 30,
      step: 0.1,
      defaultValue: 3,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 0.5,
      defaultValue: 12,
      group: "byArea",
    },
    {
      key: "tileWidth",
      label: "Ширина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
      hint: "Введите номинальный размер конкретного артикула. Калибр и фактический размер партии калькулятор не определяет.",
    },
    {
      key: "tileHeight",
      label: "Высота/длина плитки",
      type: "slider",
      unit: "мм",
      min: 50,
      max: 1200,
      step: 10,
      defaultValue: 300,
      hint: "Для прямоугольной плитки порядок сторон не влияет на количество, но важен для будущей раскладки.",
    },
    {
      key: "packagingMode",
      label: "Данные упаковки",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "Оценить по площади" },
        { value: 1, label: "Ввести по этикетке" },
      ],
      hint: "Точный итог к покупке получается по числу плиток на этикетке конкретной коллекции.",
    },
    {
      key: "packArea",
      label: "Площадь коробки для оценки",
      type: "number",
      unit: "м²",
      min: 0.1,
      max: 20,
      step: 0.001,
      defaultValue: 1.44,
      hint: "Возьмите значение с коробки или карточки товара. 1,44 м² — только стартовый пример, у коллекций фасовка различается.",
      hideIf: { key: "packagingMode", op: "eq", value: 1 },
    },
    {
      key: "tilesPerPackage",
      label: "Плиток в коробке",
      type: "number",
      unit: "шт.",
      min: 1,
      max: 500,
      step: 1,
      integerOnly: true,
      defaultValue: 16,
      hint: "Введите целое количество с этикетки или карточки конкретного артикула.",
      hideIf: { key: "packagingMode", op: "eq", value: 0 },
    },
    {
      key: "layingMethod",
      label: "Способ укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Прямая" },
        { value: 1, label: "Диагональная" },
        { value: 2, label: "Кирпичная (со смещением)" },
        { value: 3, label: "Ёлочка (укрупнённый запас)" },
      ],
      hint: "Это фиксированные запасы модели 10/15/10/20%, а не карта раскроя. Для сложного рисунка проверьте раскладку по фактическим размерам участка.",
    },
    {
      key: "jointWidth",
      label: "Ширина шва",
      type: "slider",
      unit: "мм",
      min: 1,
      max: 10,
      step: 0.5,
      defaultValue: 2,
    },
    {
      key: "jointDepth",
      label: "Глубина шва затирки",
      type: "slider",
      unit: "мм",
      min: 2,
      max: 15,
      step: 0.5,
      defaultValue: 6,
      hint: "Обычно равна ширине шва или 2/3 толщины плитки",
    },
    {
      key: "roomComplexity",
      label: "Сложность помещения",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Простое (прямоугольник)" },
        { value: 1, label: "Среднее (короба, ниши)" },
        { value: 2, label: "Сложное (много углов, радиусы)" },
      ],
      hint: "Модель добавляет к базовому запасу 0/5/10%. Проёмы, отдельные плоскости и рисунок здесь не раскладываются.",
    },
    ...(tileManufacturerField ? [tileManufacturerField] : []),
  ],
  calculate(inputs) {
    const result = computeCanonicalTile(
      tileCanonicalSpec,
      {
        inputMode: inputs.inputMode,
        length: inputs.length,
        width: inputs.width,
        area: inputs.area,
        tileWidthCm: (inputs.tileWidth ?? 300) / 10,
        tileHeightCm: (inputs.tileHeight ?? 300) / 10,
        packagingMode: inputs.packagingMode,
        packArea: inputs.packArea,
        tilesPerPackage: inputs.tilesPerPackage,
        jointWidth: inputs.jointWidth,
        groutDepth: inputs.jointDepth,
        layoutPattern: inputs.layoutPattern ?? mapLegacyMethodToCanonical(inputs.layingMethod),
        roomComplexity: inputs.roomComplexity !== undefined ? mapLegacyComplexityToCanonical(inputs.roomComplexity) : 1,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTables.factors,
    );

    const manufacturer = getManufacturerByIndex("tile", inputs.manufacturer);
    if (manufacturer) {
      result.materials = result.materials.map((m) =>
        m.category === "Основное"
          ? {
              ...m,
              name: `${m.name} — ${manufacturer.name}`,
              subtitle: `${m.subtitle ?? ""}; бренд выбран как подпись, характеристики конкретного артикула автоматически не подставляются`,
            }
          : m
      );
      result.warnings.unshift(
        `Выбран производитель ${manufacturer.name}, но расчёт не загружает его конкретную коллекцию: размеры, число плиток в коробке, калибр и область применения проверьте по артикулу.`,
      );
    }

    const wastePercent = Number(result.totals.wastePercent ?? 0);
    const glueRate = Number(result.totals.glueRateKgPerM2 ?? 0);
    const jointWidth = Number(result.totals.jointWidth ?? 0);
    const groutDepth = Number(result.totals.groutDepth ?? 0);
    const tileSizeLabel = `${Math.round(Number(result.totals.tileWidthCm ?? 0) * 10)}×${Math.round(Number(result.totals.tileHeightCm ?? 0) * 10)} мм`;
    result.materials = result.materials.map((material) => {
      if (material.category === "Основное") {
        return {
          ...material,
          subtitle: `${material.subtitle ?? ""}; базовый запас раскладки ${wastePercent}% применяется до режима точности и MIN/REC/MAX`,
        };
      }
      if (material.category === "Клей") {
        return {
          ...material,
          subtitle: `Формат ${tileSizeLabel}; предварительная норма модели ${glueRate} кг/м² только по среднему размеру плитки; зуб шпателя, способ нанесения, основание и фактический расход берите из техкарты выбранного клея`,
        };
      }
      if (material.category === "Затирка") {
        if (material.name.includes("герметик")) {
          return {
            ...material,
            subtitle: "Грубая оценка 1 туба на 15 м² облицовки, не расчёт длины и сечения швов; фактический периметр и деформационные швы задаются проектом",
          };
        }
        return {
          ...material,
          subtitle: `Цементная модель: шов ${jointWidth} мм × глубина ${groutDepth} мм × 1600 кг/м³ × 1,10; пригодность для влажных зон и плитки проверьте по техкарте`,
        };
      }
      if (material.name.includes("Грунтовка")) {
        return {
          ...material,
          subtitle: "Условная позиция: 0,15 л/м² до поправки режима точности; грунт нужен только когда его требует основание, гидроизоляция и выбранный клей",
        };
      }
      if (material.name.includes("Крестики") || material.name.includes("СВП")) {
        return {
          ...material,
          subtitle: `Размер соответствует указанной ширине шва ${jointWidth} мм; черновая оценка: 1 элемент на каждую плитку к покупке ×1,20 и поправка расходников, а не схема расстановки`,
        };
      }
      return material;
    });

    result.warnings = result.warnings.map((warning) =>
      warning.includes("Крупный формат требует двойного нанесения клея")
        ? "Крупный формат: модель добавляет 5% к плитке и применяет 6,5 кг/м² клея. Способ нанесения и допустимый формат определяет техкарта выбранного клея."
        : warning,
    );
    result.warnings.unshift(
      "Клей, затирка, грунт, крестики/СВП и герметик — предварительные позиции общей модели, а не совместимая система материалов к покупке.",
    );
    result.practicalNotes = (result.practicalNotes ?? []).filter(
      (note) => !note.includes("двойное нанесение клея обязательно"),
    );
    return result;
  },
  formulaDescription: `
**Расчёт плитки:**
Количество плитки считается по площади и номинальному размеру элемента. Затем складываются фиксированный запас раскладки
(10/15/10/20%), сложность участка (0/5/10%) и 5% для среднего размера свыше 600 мм. После этого отдельно применяются
режим точности и MIN/REC/MAX. Для закупочного округления укажите число плиток в коробке по этикетке; режим по площади
коробки остаётся предварительной оценкой. Клей, затирка и расходники — условная ведомость по константам общей модели.
  `,
  howToUse: [
    "Введите размеры или площадь укладки",
    "Укажите размер плитки и выберите: предварительная оценка упаковки или точное количество по этикетке",
    "Выберите способ укладки и сложность помещения",
    "Нажмите «Рассчитать» и отдельно проверьте товарные нормы клея, затирки и расходников",
  ],
  expertTips: [
    {
      title: "Подготовка основания",
      content: "Проверяйте плоскость основания до укладки. На крупном формате даже небольшие перепады быстро приведут к лишнему расходу клея и проблемам со швами.",
      author: "Мастер-отделочник"
    },
    {
      title: "Запас на подрезку",
      content: "Чем сложнее раскладка и чем крупнее формат плитки, тем выше отходы. Лучше планировать запас заранее, чем добирать плитку из другой партии.",
      author: "Прораб"
    }
  ],
  faq: [
    {
      question: "Почему калькулятор показывает три сценария?",
      answer:
        "MIN — ориентир при «идеальной» раскладке, REC — рабочий запас, MAX — более жёсткий запас под сложные углы, рисунок и дорогую плитку. Так проще решить объём закупки и уменьшить риск добора другой партии.",
    },
    {
      question: "Почему для точного расчёта нужно количество плиток в коробке?",
      answer:
        "У разных коллекций одного и того же формата бывает разная фасовка. В режиме «По этикетке» калькулятор использует точное количество плиток в коробке. Расчёт только по площади коробки помечается как предварительная оценка.",
    },
    {
      question: "Нужна ли система выравнивания плитки?",
      answer:
        "Это зависит от плитки, основания, схемы швов и технологии мастера. Текущая модель автоматически показывает СВП при среднем размере от 45 см, но считает клипсы грубо: одна на каждую плитку к покупке, затем ×1,20 и поправка расходников. Реальную схему размещения и совместимость с толщиной плитки нужно определить отдельно.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта плитки</h2>
<p>Количество плитки рассчитывается по площади и номинальному размеру элемента:</p>
<p><strong>N = S / S<sub>пл</sub> &times; (1 + К<sub>отход</sub>/100)</strong></p>
<ul>
  <li><strong>S</strong> — площадь облицовки (м&sup2;)</li>
  <li><strong>S<sub>пл</sub></strong> — площадь одной плитки (м&sup2;)</li>
  <li><strong>К<sub>отход</sub></strong> — сумма фиксированного запаса схемы, сложности и размерной надбавки текущей модели</li>
</ul>
<p>Прямая и укладка со смещением используют 10%, диагональ — 15%, ёлочка — 20%; сложность добавляет 0/5/10%, а средний размер стороны свыше 600 мм — ещё 5%. Затем режим точности и MIN/REC/MAX применяют дополнительные раскрытые множители. Это закупочная эвристика, а не карта раскроя конкретного участка.</p>

<h2>Какие нормы сопутствующих материалов использует модель</h2>
<table>
  <thead>
    <tr><th>Материал</th><th>Расход</th><th>Условия</th></tr>
  </thead>
  <tbody>
    <tr><td>Плиточный клей</td><td>3,5 кг/м&sup2;</td><td>Средняя сторона меньше 200 мм</td></tr>
    <tr><td>Плиточный клей</td><td>4,0 кг/м&sup2;</td><td>От 200 до менее 400 мм</td></tr>
    <tr><td>Плиточный клей</td><td>5,5 кг/м&sup2;</td><td>От 400 до 600 мм включительно</td></tr>
    <tr><td>Плиточный клей</td><td>6,5 кг/м&sup2;</td><td>Более 600 мм</td></tr>
    <tr><td>Цементная затирка</td><td>По геометрии шва</td><td>Плотность 1600 кг/м&sup3; и потери ×1,10</td></tr>
    <tr><td>Грунт</td><td>0,15 л/м&sup2;</td><td>До поправки режима точности; позиция условна</td></tr>
    <tr><td>Крестики или клипсы СВП</td><td>1 на плитку ×1,20</td><td>Плюс общая поправка расходников; не схема расстановки</td></tr>
    <tr><td>Герметик</td><td>1 туба на 15 м&sup2;</td><td>Не расчёт длины и сечения швов</td></tr>
  </tbody>
</table>
<p>Размер плитки сам по себе не определяет клей, зуб шпателя и расход. Нужны основание, условия эксплуатации, заполнение обратной стороны и техкарта продукта. Например, официальная карточка Ceresit CM 16 приводит собственную таблицу около 2,0–4,2 кг/м² по стороне плитки и зубу шпателя, а для формата более 60×60 см отдельно описывает комбинированное нанесение.</p>
<p>Затирка считается как длина швов &times; ширина &times; глубина &times; 1600 кг/м³ &times; 1,10 и округляется до 2 кг. Фактическая плотность, допустимая ширина и расход должны быть взяты из техкарты выбранного состава; дополнительный мешок сверх расчёта автоматически не назначается.</p>

<h2>Коэффициент отхода по способу укладки</h2>
<ul>
  <li><strong>Прямая укладка:</strong> 10%</li>
  <li><strong>Диагональная:</strong> 15%</li>
  <li><strong>Кирпичная (со смещением):</strong> 10%</li>
  <li><strong>Ёлочка:</strong> 20%</li>
</ul>
<p>К базовому отходу прибавляется надбавка за сложность помещения (0/5/10%) и за крупный формат от 60 см (+5%).</p>

<h2>Нормативная база</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" rel="noopener noreferrer" target="_blank">СП 71.13330.2017 с изменениями № 1–4</a> — производство и приёмка отделочных работ</li>
  <li><a href="https://protect.gost.ru/gost/details/11c8f68d-d224-42fa-8a93-812cd157e1d0" rel="noopener noreferrer" target="_blank">ГОСТ 13996-2019 с поправкой 2023 года</a> — действующие общие требования к керамическим плиткам; он заменил ГОСТ 6141-91 и ГОСТ 6787-2001</li>
  <li><a href="https://protect.gost.ru/gost/details/6d1f633b-6b79-459b-9b70-727541643af7" rel="noopener noreferrer" target="_blank">ГОСТ Р 56387-2018</a> — цементные клеевые смеси для плиточных облицовок</li>
</ul>
<p>Для товарной проверки используйте первичные карточки <a href="https://ceresit.ru/ru/products/tiling/tile-adhesives/cm-16" rel="noopener noreferrer" target="_blank">Ceresit CM 16</a> и <a href="https://ceresit.ru/ru/products/tiling/grouts-and-sealants/ce_40_aquastatic" rel="noopener noreferrer" target="_blank">Ceresit CE 40</a>: они показывают, почему расход, формат, основание, шов и область применения нельзя выводить из одного размера плитки.</p>
`,
    faq: [
      {
        question: "Сколько плитки нужно на 1 м2 с учётом подрезки?",
        answer: "<p>Расход плитки на 1 м&sup2; зависит от размера плитки, способа укладки и сложности помещения. В калькуляторе базовый отход прямой укладки — 10%, диагональной — 15%:</p><table><thead><tr><th>Размер плитки</th><th>Прямая (10%)</th><th>Диагональная (15%)</th></tr></thead><tbody><tr><td>200&times;200 мм</td><td>~28 шт (1.10 м&sup2;)</td><td>~29 шт (1.15 м&sup2;)</td></tr><tr><td>300&times;300 мм</td><td>~13 шт (1.10 м&sup2;)</td><td>~13 шт (1.15 м&sup2;)</td></tr><tr><td>600&times;600 мм</td><td>~3 шт (1.10 м&sup2;)</td><td>~3.3 шт (1.15 м&sup2;)</td></tr></tbody></table><p>Для сложных помещений (ниши, короба, радиусы) калькулятор добавляет к базовому запасу ещё 5&ndash;10%.</p>",
      },
      {
        question: "Какой размер гребёнки выбрать для плиточного клея?",
        answer: "<p>Универсальной таблицы только по формату нет. Зуб шпателя и способ нанесения выбирают по техкарте клея, основанию, рельефу обратной стороны и требуемому заполнению.</p><p>Например, Ceresit CM 16 указывает зуб 4/6/8/10 мм и ориентировочный расход около 2,0/2,7/3,6/4,2 кг/м² для своих диапазонов размера. Это пример конкретного продукта, а не норма для любого клея.</p>",
      },
      {
        question: "Нужна ли система выравнивания плитки (СВП)?",
        answer: "<p>СВП — технологический выбор, а не обязательный материал по одному формату. Текущий калькулятор показывает клипсы при среднем размере от 45 см, но использует только грубую оценку «один элемент на плитку к покупке ×1,20» и не строит схему по сторонам.</p><p>Количество клипс, их высоту, ширину шва и многоразовые клинья определяйте по системе СВП, толщине плитки и фактической раскладке. СВП не заменяет подготовку основания.</p>",
      },
    ],
  },
};
