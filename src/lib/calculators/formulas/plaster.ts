import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import plasterCanonicalSpecJson from "../../../../configs/calculators/plaster-canonical.v1.json";
import { computeCanonicalPlaster } from "../../../../engine/plaster";
import type { PlasterCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex, getSpec } from "../manufacturerField";

const plasterCanonicalSpec = plasterCanonicalSpecJson as PlasterCanonicalSpec;
const VERIFIED_PLASTER_PRODUCTS = new Set([
  "Knauf Ротбанд",
  "Волма Слой",
  "Церезит CT 29",
]);
const manufacturerField = buildManufacturerField("plaster", {
  label: "Конкретный товар (необязательно)",
  hint: "Паспортный расход применяется только для проверенных карточек Ротбанд, ВОЛМА-Слой и CT 29 и только при совместимом типе смеси. Для остальных вариантов остаётся общая модель.",
});

function isCompatibleProductType(productType: string, plasterType: number): boolean {
  const normalized = productType.toLowerCase();
  if (plasterType === 0) return normalized.includes("гипсов");
  if (plasterType === 1) return normalized.includes("цементн") && !normalized.includes("цементно-извест");
  return normalized.includes("цементно-извест");
}

export const plasterDef: CalculatorDefinition = {
  id: "mixes_plaster",
  slug: "shtukaturka",
  formulaVersion: plasterCanonicalSpec.formula_version,
  title: "Калькулятор штукатурки",
  h1: "Калькулятор штукатурки онлайн — расчёт расхода смеси на стены",
  description: "Рассчитайте количество штукатурки на стены и потолок. Учёт толщины слоя, типа поверхности и производителя.",
  metaTitle: withSiteMetaTitle("Калькулятор штукатурки: Ротбанд и Волма Слой"),
  metaDescription: "Бесплатный калькулятор штукатурки: рассчитайте мешки Knauf Ротбанд и Волма Слой по площади и толщине слоя с запасом и округлением к покупке.",
  category: "walls",
  categorySlug: "steny",
  tags: ["штукатурка", "штукатурная смесь", "Knauf", "Волма", "гипсовая штукатурка", "цементная штукатурка"],
  popularity: 82,
  complexity: 1,
  fields: [
    {
      key: "inputMode",
      label: "Способ ввода площади",
      type: "radio",
      defaultValue: 0,
      options: [
        { value: 0, label: "По размерам помещения" },
        { value: 1, label: "По площади" },
      ],
    },
    {
      key: "length",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 5,
      group: "bySize",
    },
    {
      key: "width",
      label: "Ширина помещения",
      type: "slider",
      unit: "м",
      min: 1,
      max: 50,
      step: 0.5,
      defaultValue: 4,
      group: "bySize",
    },
    {
      key: "height",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2,
      max: 5,
      step: 0.1,
      defaultValue: 2.7,
      group: "bySize",
    },
    {
      key: "area",
      label: "Площадь стен",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 50,
      group: "byArea",
    },
    {
      key: "openingsArea",
      label: "Площадь окон и дверей",
      type: "slider",
      unit: "м²",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
    {
      key: "plasterType",
      label: "Тип штукатурки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Гипсовая" },
        { value: 1, label: "Цементная" },
        { value: 2, label: "Цементно-известковая" },
      ],
      hint: "Тип задаёт общую базовую норму. Если ниже выбран проверенный конкретный товар совместимого типа, его паспортный расход заменит общую норму.",
    },
    {
      key: "substrateType",
      label: "Основание",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Бетон — ×1,00" },
        { value: 2, label: "Новый кирпич — ×1,15" },
        { value: 3, label: "Старый кирпич — ×1,30" },
        { value: 4, label: "Газоблок — ×1,25" },
        { value: 5, label: "Пенобетон — ×1,20" },
      ],
      hint: "Множитель — полевое допущение текущей модели, а не паспортная норма. Одновременно он выбирает предварительный тип грунта; фактическую подготовку сверяйте с техкартой смеси.",
    },
    {
      key: "wallEvenness",
      label: "Кривизна основания",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Ровное — ×1,00" },
        { value: 2, label: "Неровное — ×1,15" },
        { value: 3, label: "Очень неровное — ×1,30" },
      ],
      hint: "Не заменяет промер толщины. Если средний слой уже определён по маякам, повышающий множитель может дать двойной учёт неровности — перед заказом сравните оба подхода.",
    },
    {
      key: "thickness",
      label: "Толщина слоя",
      type: "slider",
      unit: "мм",
      min: 5,
      max: 50,
      step: 1,
      defaultValue: 15,
      hint: "Введите среднюю, а не максимальную толщину по промерам плоскости. Допустимый слой, число нанесений и армирование зависят от конкретной смеси и основания.",
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 30,
      options: [
        { value: 25, label: "25 кг" },
        { value: 30, label: "30 кг" },
        { value: 40, label: "40 кг" },
      ],
      hint: "Используется для общей модели. Проверенный конкретный товар подставляет свою контрольную фасовку 25 или 30 кг; перед оплатой сверьте фактический мешок в магазине.",
    },
    ...(manufacturerField ? [manufacturerField] : []),
  ],
  calculate(inputs) {
    const manufacturer = getManufacturerByIndex("plaster", inputs.manufacturer);
    const brandPackKg = getSpec<number | undefined>(manufacturer, "packKg", undefined);
    const brandConsumption = getSpec<number | undefined>(
      manufacturer,
      "consumptionKgPerM2PerMm",
      undefined
    );
    const productType = getSpec<string>(manufacturer, "type", "");
    const productSourceUrl = getSpec<string>(manufacturer, "sourceUrl", "");
    const verifiedProduct = Boolean(manufacturer && VERIFIED_PLASTER_PRODUCTS.has(manufacturer.name));
    const plasterType = Math.max(0, Math.min(2, Math.round(inputs.plasterType ?? 0)));
    const compatibleProduct = Boolean(
      manufacturer &&
      verifiedProduct &&
      brandConsumption &&
      productType &&
      isCompatibleProductType(productType, plasterType)
    );

    const effectiveBagWeight = compatibleProduct ? brandPackKg ?? inputs.bagWeight : inputs.bagWeight;
    const result = computeCanonicalPlaster(plasterCanonicalSpec, {
      inputMode: inputs.inputMode,
      length: inputs.length,
      width: inputs.width,
      height: inputs.height,
      area: inputs.area,
      openingsArea: inputs.openingsArea,
      plasterType,
      thickness: inputs.thickness,
      bagWeight: effectiveBagWeight,
      substrateType: inputs.substrateType ?? 1,
      wallEvenness: inputs.wallEvenness ?? 1,
      productConsumptionKgPerM2PerMm: compatibleProduct ? brandConsumption : undefined,
      accuracyMode: inputs.accuracyMode as any,
    });

    if (!manufacturer) return result;

    if (compatibleProduct) {
      result.materials = result.materials.map((material) =>
        material.category === "Основное"
          ? { ...material, name: `${manufacturer.name} (${effectiveBagWeight ?? result.totals.bagWeight} кг)` }
          : material
      );
      result.practicalNotes = [
        ...(result.practicalNotes ?? []),
        `Для ${manufacturer.name} применён паспортный расход ${brandConsumption! * 10} кг/м² при 10 мм и контрольная фасовка ${effectiveBagWeight ?? result.totals.bagWeight} кг. Перед закупкой перепроверьте актуальную упаковку и техлист${productSourceUrl ? " по ссылке в методике ниже" : ""}.`,
      ];
      return result;
    }

    const reason = verifiedProduct
      ? `товар относится к типу «${productType}», а в форме выбран другой тип штукатурки`
      : "для позиции не зафиксирована проверенная карточка конкретного товара";
    result.warnings = [
      ...result.warnings,
      `${manufacturer.name} не изменил расчёт: ${reason}. Использована общая норма выбранного типа и фасовка из формы.`,
    ];

    return result;
  },
  formulaDescription: `
**Предварительная модель штукатурки:**

1. Чистая площадь = площадь стен − указанные проёмы.
2. Масса REC = чистая площадь × средняя толщина × базовый расход на 1 мм × множитель основания × множитель кривизны × 1,10 × режим точности.
3. Общие нормы: гипсовая 8,5; цементная 17; цементно-известковая 13 кг/м² при 10 мм. Проверенный конкретный товар совместимого типа заменяет только базовую норму и контрольную фасовку.
4. Мешки округляются вверх. Грунт, сетка, маяки, угловые профили и инструмент считаются отдельными фиксированными допущениями, которые нужно сверить с объектом и техкартой.

Среднюю толщину определяют промерами. Множитель кривизны поверх уже измеренной
средней толщины может повторно учитывать неровность, поэтому перед крупной
закупкой сравните расчёт с раскладкой маяков и паспортом выбранной смеси.
  `,
  howToUse: [
    "Введите размеры помещения или готовую площадь стен и вычтите только реально исключаемые проёмы",
    "Выберите тип смеси, основание и кривизну; проверьте, не дублирует ли кривизна уже измеренную среднюю толщину",
    "Укажите среднюю толщину слоя по промерам и фасовку мешка",
    "При необходимости выберите конкретный товар: паспортный расход применяется только к совместимому типу",
    "Сверьте мешки и предварительный список сопутствующих материалов с техкартой и фактической геометрией",
  ],
  faq: [
    {
      question: "Нужно ли вынимать маяки?",
      answer:
        "Металлические маяки обычно удаляют после схватывания и заделывают штробы той же смесью — особенно под краску, тонкие обои, фасады и во влажных зонах, чтобы не рисковать ржавчиной и трещинами. Альтернатива — пластиковые маяки под штукатурку.",
    },
    {
      question: "Можно ли штукатурить по старой краске?",
      answer:
        "Без проверки адгезии — нет: отслаивающаяся или «мелящая» краска станет слабым слоем. Надёжный путь — снять непрочное покрытие, обеспылить, загрунтовать; иногда допускается подготовка прочной краски насечкой и адгезионным грунтом по инструкции смеси.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта штукатурки</h2>
<p>Рекомендуемый сценарий считает сухую смесь так:</p>
<p><strong>M<sub>REC</sub> = S<sub>чист</sub> &times; T &times; (R<sub>10</sub> / 10) &times; K<sub>осн</sub> &times; K<sub>крив</sub> &times; 1,10 &times; K<sub>точн</sub></strong></p>
<ul>
  <li><strong>S<sub>чист</sub></strong> — площадь стен минус указанные проёмы, м&sup2;;</li>
  <li><strong>T</strong> — измеренная средняя толщина, мм;</li>
  <li><strong>R<sub>10</sub></strong> — общая норма типа смеси или расход проверенного конкретного товара на 10 мм;</li>
  <li><strong>K<sub>осн</sub></strong> — бетон 1,00; новый кирпич 1,15; старый кирпич 1,30; газоблок 1,25; пенобетон 1,20;</li>
  <li><strong>K<sub>крив</sub></strong> — ровное 1,00; неровное 1,15; очень неровное 1,30;</li>
  <li><strong>1,10</strong> — фиксированный запас текущей canonical-модели; режим точности и MIN/MAX могут добавить свои поправки.</li>
</ul>
<p>Если средняя толщина уже получена подробным промером неровной стены, дополнительный множитель кривизны может повторно учесть один и тот же перепад. Для крупной закупки сравните расчёт с картой промеров.</p>

<h2>Какие нормы использует калькулятор</h2>
<table>
  <thead>
    <tr><th>Модель</th><th>Расход на 10 мм, кг/м&sup2;</th><th>Как применяется</th></tr>
  </thead>
  <tbody>
    <tr><td>Гипсовая, общая</td><td>8,5</td><td>Когда конкретный товар не выбран</td></tr>
    <tr><td>Цементная, общая</td><td>17</td><td>Когда конкретный товар не выбран</td></tr>
    <tr><td>Цементно-известковая, общая</td><td>13</td><td>Когда конкретный товар не выбран</td></tr>
    <tr><td>КНАУФ-Ротбанд</td><td>около 8,5</td><td>Только при выбранной гипсовой смеси</td></tr>
    <tr><td>ВОЛМА-Слой</td><td>8&ndash;9; в расчёте 8,5</td><td>Только при выбранной гипсовой смеси</td></tr>
    <tr><td>Церезит CT 29</td><td>около 15</td><td>Только при выбранной цементной смеси</td></tr>
  </tbody>
</table>
<p>У одного производителя есть смеси с разными расходами, основаниями, толщинами и фасовками. Поэтому непроверенные общие позиции производителя не подменяют расчёт. Допустимую толщину, нанесение в несколько проходов, подготовку и армирование берут из актуальной техкарты конкретного продукта.</p>

<h2>Нормативная база</h2>
<ul>
  <li><a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" rel="noopener noreferrer">СП 71.13330.2017 с изменениями № 1&ndash;4</a> &mdash; действующий свод правил по производству и приёмке отделочных работ;</li>
  <li><a href="https://www.knauf.ru/catalog/sukhie-stroitelnye-smesi-i-gotovye-sostavy/shtukaturki/shtukaturki-gipsovye/knauf-rotband/" rel="noopener noreferrer">официальная карточка КНАУФ-Ротбанд</a> &mdash; расход около 8,5 кг/м&sup2; при 10 мм, стены 5&ndash;50 мм, потолки 5&ndash;15 мм, несколько фасовок;</li>
  <li><a href="https://www.volma.ru/production/catalog/plaster/volma-sloy/" rel="noopener noreferrer">официальная карточка ВОЛМА-Слой</a> &mdash; расход 8&ndash;9 кг/м&sup2; при 10 мм, рекомендуемый слой 5&ndash;30 мм, фасовки 5/15/30 кг;</li>
  <li><a href="https://www.ceresit.ru/ru/products/etics/prepare-and-repair/ct-29-plaster-and-repair-filler" rel="noopener noreferrer">официальная карточка Церезит CT 29</a> &mdash; около 1,5 кг/м&sup2; на 1 мм.</li>
</ul>

<h2>Что означает список материалов</h2>
<ul>
  <li><strong>Грунт</strong> &mdash; 0,3 кг/м&sup2; бетоноконтакта для выбранного бетона или 0,1 л/м&sup2; грунта для впитывающего основания, затем +10% и тара 5 кг/л;</li>
  <li><strong>Сетка</strong> &mdash; автоматически появляется при слое более 30 мм как площадь &times; 1,10; это сигнал для проверки, а не проект армирования;</li>
  <li><strong>Маяки</strong> &mdash; условно не менее двух, далее 1 шт. на 2,5 м&sup2;; фактический шаг по одной площади неизвестен;</li>
  <li><strong>Угловой профиль</strong> &mdash; только в режиме помещения: четыре вертикальных угла, +10%, профиль 3 м;</li>
  <li><strong>Правило, шпатель, вёдра, миксер и перчатки</strong> &mdash; инвентарный чек-лист, а не расход на объект.</li>
</ul>
`,
    faq: [
      {
        question: "Какой расход гипсовой штукатурки Ротбанд на 1 м²?",
        answer: "<p>Официальная карточка КНАУФ-Ротбанд указывает около <strong>8,5 кг/м&sup2;</strong> при слое 10 мм. Для бетонного ровного основания, базового режима и 30 м&sup2; при средней толщине 20 мм калькулятор даст: 30 &times; 20 &times; 0,85 &times; 1,10 = <strong>561 кг</strong>, то есть 19 мешков по 30 кг.</p><p>У товара есть и другие фасовки, а допустимые слои отличаются для стен и потолков. Перед заказом проверьте актуальный мешок, основание и информационный лист.</p>",
      },
      {
        question: "Какой расход Волма Слой на 1 м²?",
        answer: "<p>В актуальной карточке ВОЛМА-Слой указан диапазон <strong>8&ndash;9 кг/м&sup2;</strong> при 10 мм. Калькулятор использует середину диапазона 8,5 кг/м&sup2;. Для бетонного ровного основания, базового режима, 30 м&sup2; и 15 мм это 30 &times; 15 &times; 0,85 &times; 1,10 = <strong>420,75 кг</strong>, или 15 мешков по 30 кг.</p><p>Производитель также указывает фасовки 5 и 15 кг; текущий товарный пресет считает контрольную фасовку 30 кг.</p>",
      },
      {
        question: "Гипсовая или цементная штукатурка — что выбрать?",
        answer: "<p>Выбирайте не только по вяжущему, а по области применения конкретного товара: основанию, влажностному режиму, наружным или внутренним работам, допустимой толщине и следующему покрытию.</p><p>Например, КНАУФ-Ротбанд предназначен для внутренних работ и допускается производителем в кухнях и ванных при защите от увлажнения, а цементные продукты тоже различаются по фасаду, цоколю, влажным зонам и допустимому слою. Универсальной таблицы выбора для всех смесей нет.</p>",
      },
      {
        question: "Нужно ли армировать штукатурку сеткой?",
        answer: "<p>Это зависит от материала основания, стыков, толщины, условий работы и системы производителя. Калькулятор автоматически добавляет сетку при слое более 30 мм как <strong>чистая площадь &times; 1,10</strong>, но это только закупочный сигнал.</p><p>Тип, плотность, щёлочестойкость, ширину локальных полос, сплошное или локальное армирование и положение сетки нужно принять по техкарте конкретной штукатурки и фактическому основанию.</p>",
      },
    ],
  },
};
