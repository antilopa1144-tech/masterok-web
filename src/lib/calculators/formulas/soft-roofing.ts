import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalSoftRoofing } from "../../../../engine/soft-roofing";
import softroofingSpec from "../../../../configs/calculators/soft-roofing-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const formatRuNumber = (value: number): string => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
}).format(value);

export const softRoofingDef: CalculatorDefinition = {
  id: "soft_roofing",
  slug: "myagkaya-krovlya",
  title: "Калькулятор мягкой кровли",
  h1: "Калькулятор мягкой кровли онлайн — расчёт гибкой черепицы",
  description: "Рассчитайте гибкую черепицу, сплошной подкладочный и ендовный ковры, кровельные гвозди и доборные элементы. ОСП — только по явному выбору.",
  metaTitle: withSiteMetaTitle("Калькулятор мягкой кровли: материалы онлайн"),
  metaDescription: "Бесплатный калькулятор мягкой кровли: рассчитайте гибкую черепицу, сплошной подкладочный и ендовный ковры, кровельные гвозди и доборные элементы.",
  category: "roofing",
  categorySlug: "krovlya",
  tags: ["мягкая кровля", "гибкая черепица", "Шинглас", "Технониколь", "битумная черепица"],
  popularity: 71,
  complexity: 2,
  fields: [
    {
      key: "roofArea",
      label: "Площадь кровли",
      type: "slider",
      unit: "м²",
      min: 10,
      max: 500,
      step: 1,
      defaultValue: 80,
      hint: "Фактическая площадь всех скатов, а не горизонтальная проекция. Проёмы, трубы и сложную раскладку гонтов модель не вычитает и не строит.",
    },
    {
      key: "slope",
      label: "Уклон кровли",
      type: "slider",
      unit: "°",
      min: 12,
      max: 60,
      step: 1,
      defaultValue: 30,
      hint: "Диапазон 12–60° относится к механическому монтажу на деревянном основании в этой модели. Применимость конкретной коллекции и способа монтажа проверяйте по инструкции.",
    },
    {
      key: "ridgeLength",
      label: "Суммарная длина коньков и рёбер",
      type: "slider",
      unit: "м",
      min: 0,
      max: 50,
      step: 0.5,
      defaultValue: 8,
      hint: "Используется и для подкладочного ковра, и для условного числа коньково-карнизных элементов. Укажите также наклонные рёбра, если их закрывает та же комплектация.",
    },
    {
      key: "eaveLength",
      label: "Длина карнизов",
      type: "slider",
      unit: "м",
      min: 0,
      max: 100,
      step: 1,
      defaultValue: 20,
      hint: "Суммарная фактическая длина карнизных свесов. Длина фронтонных свесов отдельно не вводится, поэтому ветровые планки автоматически не считаются.",
    },
    {
      key: "valleyLength",
      label: "Длина ендов",
      type: "slider",
      unit: "м",
      min: 0,
      max: 30,
      step: 0.5,
      defaultValue: 0,
      hint: "Суммарная длина внутренних стыков скатов. Ширину ковра, нахлёсты, выпуски и конкретную схему ендовы сверяйте по инструкции системы.",
    },
    {
      key: "includeOsb",
      label: "Добавить новое основание ОСП-3",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Нет — основание уже есть или считается отдельно" },
        { value: 1, label: "Да — предварительно лист 1250×2500×12 мм" },
      ],
      hint: "Толщина 12 мм не подбирается по шагу опор и нагрузкам. В расчёт не входят ФСФ/доска, раскрой, швы по опорам, крепёж и усиление карниза.",
      fullWidth: true,
    },
  ],
  calculate(inputs) {
    const spec = softroofingSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalSoftRoofing(spec, inputs, factorTable);
    const includeOsb = Number(inputs.includeOsb ?? 0) === 1;
    const roofArea = canonical.totals.roofArea;
    const fullUnderlaymentRolls = Math.ceil(
      roofArea * spec.material_rules.underlayment_full_reserve / spec.material_rules.underlayment_roll,
    );
    const packArea = spec.material_rules.pack_area as number;
    const packReserve = spec.material_rules.pack_reserve as number;
    const materials = canonical.materials
      .filter((material) => {
        if (material.name.startsWith("Мастика битумно-полимерная")) return false;
        if (material.name.startsWith("Ветровые планки")) return false;
        if (material.name.startsWith("Вентиляционные выходы")) return false;
        if (material.name.includes("ориентированно-стружечная") && !includeOsb) return false;
        return true;
      })
      .map((material) => {
        if (material.category === "Основное") {
          return {
            ...material,
            name: `Гибкая черепица — расчётный профиль ${formatRuNumber(packArea)} м²/уп`,
            quantity: canonical.totals.packs,
            withReserve: canonical.totals.packs,
            purchaseQty: canonical.totals.packs,
            subtitle: `ceil(${formatRuNumber(roofArea)} м² / ${formatRuNumber(packArea)} м²/уп × ${formatRuNumber(packReserve)}) → режим точности = ${canonical.totals.packs} уп. Фактическую площадь упаковки, форму нарезки и код цвета проверьте у выбранной коллекции`,
          };
        }
        if (material.name.startsWith("Подкладочный ковёр")) {
          return {
            ...material,
            name: `Подкладочный ковёр — расчётный рулон ${formatRuNumber(spec.material_rules.underlayment_roll)} м²`,
            quantity: fullUnderlaymentRolls,
            withReserve: fullUnderlaymentRolls,
            purchaseQty: fullUnderlaymentRolls,
            subtitle: `ceil(${formatRuNumber(roofArea)} м² × ${formatRuNumber(spec.material_rules.underlayment_full_reserve)} / ${formatRuNumber(spec.material_rules.underlayment_roll)} м²) = ${fullUnderlaymentRolls} рул. по всей площади. Нахлёсты, тип ковра и самоклеящиеся зоны проверяйте по инструкции`,
          };
        }
        if (material.name.startsWith("Ендовный ковёр")) {
          return {
            ...material,
            subtitle: `ceil(${formatRuNumber(canonical.totals.valleyLength)} м × ${formatRuNumber(spec.material_rules.valley_reserve)} / ${formatRuNumber(spec.material_rules.valley_roll)} м) = ${canonical.totals.valleyRolls} рул. Ширина, нахлёсты и способ устройства ендовы не выбраны`,
          };
        }
        if (material.name.startsWith("Гвозди ершёные")) {
          const rate = canonical.totals.slope <= spec.material_rules.nails_high_slope_threshold
            ? spec.material_rules.nails_kg_per_m2_low_slope
            : spec.material_rules.nails_kg_per_m2_high_slope;
          return {
            ...material,
            subtitle: `${formatRuNumber(roofArea)} м² × ${formatRuNumber(rate)} кг/м² × ${formatRuNumber(spec.material_rules.nail_reserve)} = ${formatRuNumber(canonical.totals.nailsKg)} кг; к покупке ${material.purchaseQty} кг. Профиль относится к распространённой нарезке Sonata/Accord`,
          };
        }
        if (material.name.startsWith("Карнизные планки")) {
          return {
            ...material,
            subtitle: `ceil(${formatRuNumber(canonical.totals.eaveLength)} м / ${formatRuNumber(spec.material_rules.eave_strip_length)} м × ${formatRuNumber(spec.material_rules.eave_reserve)}) = ${canonical.totals.eaveStrips} шт. Нахлёст и фактическая товарная длина требуют проверки`,
          };
        }
        if (material.name.startsWith("Коньково-карнизная черепица")) {
          return {
            ...material,
            name: "Коньково-карнизная черепица — расчётные элементы",
            subtitle: `ceil(${formatRuNumber(canonical.totals.ridgeLength)} м / 0,5 м × ${formatRuNumber(spec.material_rules.ridge_reserve)}) = ${canonical.totals.ridgeShingles} элемента. Это не число упаковок: выход из пачки зависит от коллекции и способа разделения`,
          };
        }
        if (material.name.includes("ориентированно-стружечная")) {
          return {
            ...material,
            name: "ОСП-3 1250×2500×12 мм — предварительный вариант основания",
            subtitle: `ceil(${formatRuNumber(roofArea)} м² / ${formatRuNumber(spec.material_rules.osb_sheet)} м² × ${formatRuNumber(spec.material_rules.osb_reserve)}) = ${canonical.totals.osbSheets} лист. Толщина, раскрой, швы по опорам и крепёж не рассчитаны`,
          };
        }
        return material;
      });

    const warnings = canonical.warnings.filter((warning) => !warning.includes("Уклон менее 18°"));
    warnings.unshift(
      `Подкладочный ковёр посчитан по всей площади: ${fullUnderlaymentRolls} рул. по ${formatRuNumber(spec.material_rules.underlayment_roll)} м² с коэффициентом ${formatRuNumber(spec.material_rules.underlayment_full_reserve)}. Частичная схема допустима не для всех нарезок, регионов и гарантийных условий.`,
      "Мастика исключена из web-ведомости: старая модель автоматически прибавляла 0,10 кг на каждый м² кровли и 0,10 кг на метр конька, карниза и ендовы без выбора продукта и реальных зон приклейки.",
      "Ветровые планки не рассчитаны: длина фронтонных свесов не вводится, а прежнее допущение 40% от длины карнизов не описывает геометрию крыши.",
      "Точечные аэраторы не рассчитаны: схема притока/вытяжки, сечение вентканалов, длина конька и производительность выбранного изделия должны определяться проектом кровельной вентиляции.",
      `Профиль основной черепицы фиксирует ${formatRuNumber(packArea)} м²/уп и базовые 5%, затем применяет режим точности. MIN/REC/MAX ниже меняют только упаковки черепицы; ковры, гвозди, планки, ендова и ОСП между сценариями не пересчитываются.`,
    );
    warnings.push(
      includeOsb
        ? "ОСП включена только как предварительный лист 1250×2500×12 мм. Допустимую толщину, шаг и направление опор, раскрой, зазоры, крепёж и усиление свесов подтвердите расчётом основания."
        : "Новое основание ОСП не включено. До монтажа подтвердите, что существующий сплошной настил ровный, сухой, жёсткий и допускается инструкцией выбранной системы.",
    );

    const practicalNotes = (canonical.practicalNotes ?? [])
      .filter((note) => !note.includes("сплошной подкладочный ковёр"))
      .map((note) => note.includes("выше +5°C")
        ? "Температурные условия зависят от материала: актуальная инструкция SHINGLAS требует отдельной подготовки гонтов и ковров при холодном монтаже; самоклеящиеся ковры обычно имеют более высокий температурный порог."
        : note);
    practicalNotes.unshift("Подкладочный ковёр в web-результате принят сплошным по всей площади независимо от уклона; тип ковра и схему нахлёстов выбирают по инструкции системы.");

    const totals = { ...canonical.totals, underlaymentRolls: fullUnderlaymentRolls };
    delete totals.masticKg;
    delete totals.masticBuckets;
    delete totals.windStrips;
    delete totals.ventOutputs;
    if (!includeOsb) delete totals.osbSheets;

    return {
      materials,
      totals,
      warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
    };
  },
  formulaDescription: `
**Гибкая черепица:** ceil(площадь скатов / 3 м² на упаковку × 1,05) → выбранный режим точности. Площадь упаковки и запас 5% — фиксированный профиль модели, а не паспорт любой коллекции.

**Подкладочный ковёр:** ceil(площадь скатов × 1,15 / 15 м² на рулон). Web-результат считает сплошное покрытие независимо от уклона; тип ковра, нахлёсты и самоклеящиеся зоны не подбираются.

**Ендовный ковёр:** ceil(длина ендов × 1,15 / 10 м на рулон).

**Гвозди Sonata/Accord:** площадь × 0,10 кг/м² при 12–45° или × 0,15 кг/м² выше 45°, затем × 1,05 и округление до коробок 5 кг.

**Карнизные планки:** ceil(длина карнизов / 2 м × 1,05). Ветровые планки без длины фронтонов не рассчитываются.

**Коньки и рёбра:** ceil(суммарная длина / 0,5 м × 1,05) расчётных элементов. Это не число упаковок.

ОСП добавляется только по явному выбору. Мастика и кровельная вентиляция без продукта, узлов и схемы не включаются. MIN/REC/MAX меняют только упаковки основной черепицы.
  `,
  howToUse: [
    "Введите фактическую площадь всех скатов, а не горизонтальную проекцию",
    "Укажите уклон в пределах механического монтажа этой модели и проверьте допустимость выбранной коллекции",
    "Введите суммарные длины коньков с рёбрами, карнизов и ендов по схеме крыши",
    "Добавляйте ОСП только если действительно нужно новое сплошное основание; толщину и раскрой рассчитывайте по опорам",
    "Сверьте упаковку черепицы, ковры, гвозди, мастику, вентиляцию, фронтонные планки и проходки с одной системной инструкцией до заказа",
  ],
  faq: [
    {
      question: "Нужен ли подкладочный ковёр под гибкую черепицу?",
      answer:
        "Для безопасной универсальной ведомости калькулятор считает ковёр по всей площади скатов. ТЕХНОНИКОЛЬ указывает сплошную укладку как условие максимальной надёжности и гарантии; частичная схема допускается только для отдельных нарезок, регионов и условий и может сокращать гарантийный срок. Выбирайте схему по актуальной инструкции конкретной системы.",
    },
    {
      question: "Что означает запас 5% в калькуляторе?",
      answer:
        "Это фиксированный коэффициент старой модели до режима точности. Он не распознаёт форму нарезки, рисунок, стартовую полосу, раскладку, купола, ендовы и повторное использование обрезков. Фактический запас определяют по карте раскладки и инструкции выбранной коллекции; покупайте один код цвета и одну производственную партию.",
    },
    {
      question: "Почему калькулятор не показывает аэраторы и мастику?",
      answer:
        "Потому что одной площади крыши для них недостаточно. Для вентиляции нужны схема притока и вытяжки, сечение и высота каналов, длина конька и производительность изделия. Для мастики нужны конкретный продукт и реальные зоны приклейки, примыкания, ендовы и проходки. Старые универсальные коэффициенты удалены из web-заказа как неподтверждённые.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что считает калькулятор гибкой черепицы</h2>
<p>Калькулятор даёт предварительную закупочную ведомость для механически закрепляемой гибкой черепицы на деревянном основании: основной материал, сплошной подкладочный ковёр, ендовный ковёр, гвозди, карнизные планки, расчётные коньково-карнизные элементы и — только по явному выбору — предварительные листы ОСП-3.</p>
<p>Модель не выбирает коллекцию, форму нарезки, код цвета, продуктовый подкладочный ковёр, фронтонные планки, мастику, проходки, снегозадержание или систему подкровельной вентиляции. Эти позиции нельзя получить только из площади и трёх линейных размеров.</p>

<h2>Формула упаковок гибкой черепицы</h2>
<p><strong>N<sub>база</sub> = &lceil;S<sub>скатов</sub> / 3,0 &times; 1,05&rceil;</strong></p>
<ul>
  <li><strong>S<sub>скатов</sub></strong> — фактическая площадь всех скатов, не горизонтальная проекция</li>
  <li><strong>3,0 м&sup2;/уп</strong> — фиксированный расчётный профиль; паспорт выбранной пачки имеет приоритет</li>
  <li><strong>1,05</strong> — базовый коэффициент модели до выбранного режима точности</li>
</ul>
<p>Основная карточка показывает число упаковок после текущего режима точности. MIN/REC/MAX ниже — отдельная сценарная надстройка только для черепицы; она не пересчитывает ковры, крепёж, планки, ендову или ОСП. Поэтому пример 100 м&sup2; даёт 35 упаковок только в базовом режиме до дополнительных модификаторов: &lceil;100 / 3 &times; 1,05&rceil; = 35.</p>

<h2>Подкладочный и ендовный ковры</h2>
<p>Web-ведомость принимает сплошной подкладочный ковёр по всей площади:</p>
<p><strong>N<sub>ковра</sub> = &lceil;S<sub>скатов</sub> &times; 1,15 / 15&rceil;</strong></p>
<p>Например, для 80 м&sup2; это &lceil;80 &times; 1,15 / 15&rceil; = <strong>7 рулонов</strong>, а не три рулона условных полос. Коэффициент 1,15 и рулон 15 м&sup2; остаются профилем модели. Реальная полезная площадь зависит от ширины полотна, направления раскатки, продольных и поперечных нахлёстов, самоклеящихся зон и конкретного ANDEREP.</p>
<p>Ендовный ковёр считается отдельно как <strong>&lceil;L<sub>ендов</sub> &times; 1,15 / 10&rceil;</strong>. Ширину полотна, верхний нахлёст, способ крепления и переход ендовы на скат задаёт инструкция системы.</p>

<h2>Что входит в результат</h2>
<table>
  <thead><tr><th>Позиция</th><th>Формула модели</th><th>Граница</th></tr></thead>
  <tbody>
    <tr><td>Гвозди Sonata/Accord</td><td>S &times; 0,10 кг/м&sup2; до 45&deg; или 0,15 кг/м&sup2; выше &times; 1,05</td><td>Коробка 5 кг; другая нарезка требует своей таблицы</td></tr>
    <tr><td>Карнизные планки</td><td>&lceil;L<sub>карнизов</sub> / 2 &times; 1,05&rceil;</td><td>Фактическая длина и нахлёсты проверяются</td></tr>
    <tr><td>Коньки и рёбра</td><td>&lceil;L / 0,5 &times; 1,05&rceil; элементов</td><td>Не упаковки; выход из пачки зависит от коллекции</td></tr>
    <tr><td>ОСП-3</td><td>&lceil;S / 3,125 &times; 1,05&rceil;</td><td>Только по явному выбору; лист 1250&times;2500&times;12 мм — предварительный профиль</td></tr>
  </tbody>
</table>

<h2>Сколько гвоздей нужно для гибкой черепицы на 1 м²</h2>
<p>Для распространённой нарезки Sonata/Accord модель принимает <strong>0,10 кг/м&sup2;</strong> при уклоне 12–45&deg; и <strong>0,15 кг/м&sup2;</strong> выше 45&deg;, добавляет 5% и округляет до коробок по 5 кг. На 80 м&sup2; при 30&deg; это 8 кг точно, 8,4 кг с коэффициентом и 10 кг к покупке.</p>
<p>Форма гонта, число гвоздей на один элемент, ветровой район, основание и способ крепления могут менять расход. Для другой коллекции и узлов используйте таблицу актуальной инструкции производителя.</p>

<h2>Почему не посчитаны мастика, ветровые планки и аэраторы</h2>
<ul>
  <li><strong>Мастика:</strong> старый движок автоматически назначал 0,10 кг на каждый м&sup2; кровли плюс 0,10 кг на метр карниза, конька и ендовы. Без продукта и реальных зон приклейки это не заказная величина.</li>
  <li><strong>Ветровые планки:</strong> прежняя формула принимала длину фронтонов равной 40% длины карнизов. Геометрической связи между этими величинами нет.</li>
  <li><strong>Аэраторы:</strong> прежняя формула ставила один точечный элемент на 25 м&sup2;, но актуальная инструкция различает приток, вентканал, коньковую вытяжку и изделия разной производительности. Нужен проект вентиляции, а не деление площади.</li>
</ul>

<h2>Основание и нормативная граница</h2>
<p>ОСП включается только по явному выбору пользователя. Расчётный лист 1250&times;2500&times;12 мм не определяет допустимую толщину: её выбирают по шагу и направлению опор, нагрузкам и схеме сплошного настила. Ведомость не считает раскрой, стыки по опорам, крепёж, зазоры и усиление свесов. Существующий настил должен быть ровным, сухим, жёстким и допустимым для выбранной системы.</p>
<p><a href="https://protect.gost.ru/sp/details/844352c5-dda6-4006-acd8-b6875d1ed6a8" target="_blank" rel="noopener noreferrer">СП 17.13330.2017 «Кровли» с изменениями № 1–5</a> задаёт нормативный контекст проектирования кровель, но не подтверждает универсальную пачку 3 м&sup2;, лист ОСП 12 мм, коробку гвоздей или аэратор на 25 м&sup2; для любого проекта.</p>

<h2>Первичные инструкции системы</h2>
<ul>
  <li><a href="https://nav.tn.ru/documents/installinstructions/shinglas_instructions_Web_Russian_ru_RU/" target="_blank" rel="noopener noreferrer">Инструкция по монтажу гибкой черепицы ТЕХНОНИКОЛЬ SHINGLAS 2025</a></li>
  <li><a href="https://nav.tn.ru/documents/installinstructions/ast_anderep_install_instr/" target="_blank" rel="noopener noreferrer">Инструкция по монтажу подкладочных ковров ANDEREP 2025</a></li>
  <li><a href="https://nav.tn.ru/knowledge-base/materialy/gidroizolyatsiya/cherepitsa-i-podkladochnye-kovry/gibkaya-cherepitsa/chasto-zadavaemye-voprosy-po-gibkoy-cherepitse/mozhno-li-ne-montirovat-podkladochnye-kovry-na-vsyu-ploshchad-krovli/" target="_blank" rel="noopener noreferrer">ТЕХНОНИКОЛЬ о сплошном и частичном применении подкладочного ковра</a></li>
</ul>
`,
    faq: [
      {
        question: "Сколько упаковок мягкой черепицы нужно на крышу 100 м²?",
        answer: "<p>В базовом профиле 3 м&sup2;/уп и 5% получается &lceil;100 / 3 &times; 1,05&rceil; = <strong>35 упаковок</strong> до дополнительных модификаторов режима точности. Фактическую площадь пачки, запас раскладки, форму нарезки и код цвета проверьте у выбранной коллекции. MIN/REC/MAX — отдельные сценарии только для основной черепицы.</p>",
      },
      {
        question: "Нужен ли подкладочный ковёр при уклоне более 18°?",
        answer: "<p>Web-калькулятор считает подкладочный ковёр по всей площади при любом уклоне. ТЕХНОНИКОЛЬ допускает частичную схему только для отдельных форм нарезки, регионов и условий; она может уменьшать гарантийный срок. Поэтому автоматически сокращать ковёр после 18&deg; без выбранной коллекции и гарантийных условий небезопасно.</p>",
      },
      {
        question: "Какие гвозди используют для гибкой черепицы?",
        answer: "<p>Для монтажа применяют <strong>ершёные оцинкованные гвозди 3.2&times;30 мм</strong> с широкой шляпкой. Для распространённой нарезки Sonata/Accord ориентир составляет 0,10 кг/м&sup2; при уклоне 12–45&deg; и 0,15 кг/м&sup2; на более крутом скате. На кровлю 100 м&sup2; это 10 или 15 кг без запаса. Калькулятор добавляет 5% и округляет до коробок по 5 кг. Для другой коллекции сверяйтесь с инструкцией производителя.</p>",
      },
      {
        question: "Почему ОСП не добавляется автоматически?",
        answer: "<p>Площадь скатов не говорит, есть ли уже подходящий сплошной настил и какая толщина нужна. Включите ОСП явно, если требуется предварительное число листов 1250&times;2500&times;12 мм. Затем проверьте толщину по шагу опор и нагрузкам, выполните раскрой со стыками по опорам и рассчитайте крепёж.</p>",
      },
    ],
  },
};
