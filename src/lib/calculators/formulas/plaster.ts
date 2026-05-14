import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import plasterCanonicalSpecJson from "../../../../configs/calculators/plaster-canonical.v1.json";
import { computeCanonicalPlaster } from "../../../../engine/plaster";
import type { PlasterCanonicalSpec } from "../../../../engine/canonical";
import { buildManufacturerField, getManufacturerByIndex, getSpec } from "../manufacturerField";

const plasterCanonicalSpec = plasterCanonicalSpecJson as PlasterCanonicalSpec;
const manufacturerField = buildManufacturerField("plaster", {
  hint: "При выборе бренда расход на 1 м²/мм и размер мешка подставляются автоматически",
});

export const plasterDef: CalculatorDefinition = {
  id: "mixes_plaster",
  slug: "shtukaturka",
  formulaVersion: plasterCanonicalSpec.formula_version,
  title: "Калькулятор штукатурки",
  h1: "Калькулятор штукатурки онлайн — расчёт расхода смеси на стены",
  description: "Рассчитайте количество штукатурки на стены и потолок. Учёт толщины слоя, типа поверхности и производителя.",
  metaTitle: withSiteMetaTitle("Калькулятор штукатурки онлайн | Расчёт расхода"),
  metaDescription: "Бесплатный калькулятор штукатурки: рассчитайте мешки смеси Knauf, Волма, Ceresit по площади, толщине слоя и основанию. СНиП 3.04.01-87.",
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
        { value: 0, label: "Гипсовая (KnaufРотбанд, Волма Слой)" },
        { value: 1, label: "Цементная (Ceresit CT 29, Старатели)" },
        { value: 2, label: "Цементно-известковая (UNIS Силин)" },
      ],
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
      hint: "Оптимально 10–20 мм. По СНиП: до 20 мм без армирования",
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

    const effectiveBagWeight = brandPackKg ?? inputs.bagWeight;
    const result = computeCanonicalPlaster(plasterCanonicalSpec, {
      inputMode: inputs.inputMode,
      length: inputs.length,
      width: inputs.width,
      height: inputs.height,
      area: inputs.area,
      openingsArea: inputs.openingsArea,
      plasterType: inputs.plasterType,
      thickness: inputs.thickness,
      bagWeight: effectiveBagWeight,
      substrateType: inputs.substrateType ?? 1,
      wallEvenness: inputs.wallEvenness ?? 1,
      accuracyMode: inputs.accuracyMode as any,
    });

    if (!manufacturer) return result;

    const netArea = typeof result.totals.netArea === "number" ? result.totals.netArea : 0;
    const thickness = Math.max(1, inputs.thickness ?? 15);

    // Переименовываем и пересчитываем ТОЛЬКО главный материал (штукатурку).
    // Маяки, грунтовка, профили, инструмент — не относятся к бренду штукатурки.
    result.materials = result.materials.map((m) => {
      if (m.category !== "Основное") return m;

      const renamed = `${m.name} — ${manufacturer.name}`;

      if (brandConsumption && netArea > 0) {
        const packKg = effectiveBagWeight ?? 30;
        const totalKg = netArea * thickness * brandConsumption * 1.10;
        const bags = Math.ceil(totalKg / packKg);
        return {
          ...m,
          name: renamed,
          quantity: bags,
          withReserve: bags,
          purchaseQty: bags,
          packageInfo: { count: bags, size: packKg, packageUnit: "мешок" },
        };
      }

      return { ...m, name: renamed };
    });

    return result;
  },
  formulaDescription: `
**Расчёт штукатурки (практика РФ):**

1. **Расход**: Считается по площади за вычетом проемов. Запас 10% обязателен на «набрызг» и остатки в ведре.
2. **Маяки**: Устанавливаются с шагом на 20-30 см меньше длины вашего правила.
3. **Инструмент**: Для больших объемов обязательно иметь минимум два ведра (в одном месим, другое моем).
4. **Слои**: При слое более 30 мм штукатурка наносится в два этапа.
  `,
  howToUse: [
    "Укажите размеры помещения и площадь проемов",
    "Выберите тип смеси (гипс для комнат, цемент для санузлов)",
    "Задайте среднюю толщину слоя (по маякам)",
    "Нажмите «Рассчитать» — получите полный список от смеси до ведер",
  ],
  expertTips: [
    {
      title: "Установка маяков",
      content: "Используйте лазерный уровень для установки маяков. Правильно выставленные маяки экономят до 20% штукатурной смеси.",
      author: "Мастер-штукатур"
    },
    {
      title: "Чистота инструмента",
      content: "Мойте миксер и ведро сразу после каждого замеса. Засохшие крошки старого раствора в новом замесе приведут к появлению царапин на стене.",
      author: "Прораб"
    }
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
<p>Расход штукатурной смеси рассчитывается по формуле:</p>
<p><strong>M = S &times; R &times; T / 10 &times; 1.10</strong></p>
<ul>
  <li><strong>M</strong> — масса сухой смеси (кг)</li>
  <li><strong>S</strong> — площадь стен за вычетом проёмов (м&sup2;)</li>
  <li><strong>R</strong> — норма расхода смеси на 1 м&sup2; при толщине 10 мм (кг/м&sup2;)</li>
  <li><strong>T</strong> — средняя толщина слоя (мм)</li>
  <li><strong>1.10</strong> — коэффициент запаса 10% на потери</li>
</ul>

<h2>Нормы расхода штукатурки на 10 мм слоя</h2>
<table>
  <thead>
    <tr><th>Тип смеси</th><th>Расход на 10 мм, кг/м&sup2;</th><th>Применение</th></tr>
  </thead>
  <tbody>
    <tr><td>Гипсовая (Knauf Ротбанд)</td><td>8.5</td><td>Внутренние сухие помещения</td></tr>
    <tr><td>Гипсовая (Волма Слой)</td><td>8.0–9.0</td><td>Внутренние сухие помещения</td></tr>
    <tr><td>Цементная (Ceresit CT 29)</td><td>10.0</td><td>Влажные помещения, фасады</td></tr>
    <tr><td>Цементно-известковая</td><td>12.0–14.0</td><td>Универсальная</td></tr>
  </tbody>
</table>
<p>Толщина слоя определяется по маякам. При слое свыше <strong>30 мм</strong> штукатурка наносится в два этапа с армирующей сеткой. По <strong>СП 71.13330</strong> максимальная толщина одного слоя гипсовой смеси — 50 мм, цементной — 20 мм без армирования.</p>

<h2>Нормативная база</h2>
<p>Штукатурные работы регламентируются <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия» (актуализированная редакция СНиП 3.04.01-87). Пункт 7.1 определяет требования к выравниванию: допустимые отклонения от вертикали, ровность по правилу, необходимость армирования при толщине слоя свыше 20 мм (для цементных смесей).</p>

<h2>Необходимые материалы</h2>
<ul>
  <li><strong>Маяки</strong> — оцинкованные 6 или 10 мм, шаг 1.0–1.3 м</li>
  <li><strong>Грунтовка</strong> — обязательна перед нанесением штукатурки</li>
  <li><strong>Армирующая сетка</strong> — при толщине слоя &gt; 30 мм</li>
  <li><strong>Правило</strong> — 1.5 или 2.0 м для выравнивания по маякам</li>
</ul>
`,
    faq: [
      {
        question: "Какой расход гипсовой штукатурки Ротбанд на 1 м²?",
        answer: "<p>Расход Knauf Ротбанд составляет <strong>8.5 кг на 1 м&sup2;</strong> при толщине слоя 10 мм (данные производителя). Для расчёта на произвольную толщину:</p><p><strong>M = 8.5 &times; T / 10</strong>, где T — толщина в мм.</p><p>Пример: стена 30 м&sup2;, средняя толщина 20 мм. M = 30 &times; 8.5 &times; 20 / 10 &times; 1.10 = <strong>561 кг</strong> = 19 мешков по 30 кг.</p><p>Реальная средняя толщина определяется промером стены правилом в нескольких точках.</p>",
      },
      {
        question: "Гипсовая или цементная штукатурка — что выбрать?",
        answer: "<p>Выбор зависит от условий эксплуатации помещения:</p><table><thead><tr><th>Параметр</th><th>Гипсовая</th><th>Цементная</th></tr></thead><tbody><tr><td>Влажные помещения</td><td>Нет</td><td>Да</td></tr><tr><td>Фасадные работы</td><td>Нет</td><td>Да</td></tr><tr><td>Толщина слоя</td><td>до 50 мм</td><td>до 20 мм без сетки</td></tr><tr><td>Время схватывания</td><td>40–60 мин</td><td>2–4 часа</td></tr><tr><td>Шлифуемость</td><td>отличная</td><td>средняя</td></tr></tbody></table><p><strong>Гипсовая</strong> — для жилых комнат (быстрее, легче, теплее). <strong>Цементная</strong> — для санузлов, кухонь, подвалов и фасадов.</p>",
      },
      {
        question: "Нужно ли армировать штукатурку сеткой?",
        answer: "<p>Армирование штукатурки обязательно в следующих случаях:</p><ul><li>Толщина слоя <strong>свыше 30 мм</strong> (для гипсовых) или <strong>свыше 20 мм</strong> (для цементных)</li><li>Стыки разнородных материалов (кирпич + бетон, газоблок + монолит)</li><li>Оштукатуривание по утеплителю (системы СФТК)</li><li>Потолки и откосы — зоны повышенного риска трещин</li></ul><p>Используют стеклосетку плотностью <strong>160 г/м&sup2;</strong> для внутренних работ и <strong>160–320 г/м&sup2;</strong> для фасадов. Сетка утапливается в первый слой штукатурки на глубину 1/3 от общей толщины.</p>",
      },
    ],
  },
};


