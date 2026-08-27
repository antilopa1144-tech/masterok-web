import type { CalculatorDefinition, CalculatorResult, SummaryCard } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalElectric } from "../../../../engine/electric";
import { pluralizePackageUnit, pluralizeRu } from "../../format/pluralize";
import electricSpec from "../../../../configs/calculators/electric-canonical.v1.json";

function formatElectricQuantity(value: number): string {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 1 });
}

function buildElectricSummaryCards(
  materials: CalculatorResult["materials"],
  panelModules: number,
): SummaryCard[] {
  const cableCards: SummaryCard[] = [
    { section: "3×1,5", label: "Освещение · 3×1,5 мм²", icon: "💡", tone: "amber" as const },
    { section: "3×2,5", label: "Розетки · 3×2,5 мм²", icon: "🔌", tone: "violet" as const },
    { section: "3×6", label: "Электроплита · 3×6 мм²", icon: "⚡", tone: "emerald" as const },
  ].flatMap(({ section, label, icon, tone }) => {
    const material = materials.find(
      (item) => item.category === "Кабель" && item.name.includes(section),
    );
    if (!material) return [];

    const purchaseQty = material.purchaseQty ?? material.withReserve ?? material.quantity;
    const packageCount = material.packageInfo?.count;
    const value = packageCount == null
      ? formatElectricQuantity(purchaseQty)
      : formatElectricQuantity(packageCount);
    const unit = packageCount == null
      ? material.unit
      : pluralizePackageUnit(packageCount, material.packageInfo!.packageUnit);

    return [{
      icon,
      label,
      value,
      unit,
      hint: `${formatElectricQuantity(material.quantity)} ${material.unit} нужно · ${formatElectricQuantity(purchaseQty)} ${material.unit} к покупке`,
      tone,
    } satisfies SummaryCard];
  });

  if (cableCards.length < 3) {
    cableCards.push({
      icon: "▦",
      label: "Распределительный щит",
      value: formatElectricQuantity(panelModules),
      unit: pluralizeRu(panelModules, ["модуль", "модуля", "модулей"]),
      hint: "Минимальная вместимость с резервом",
      tone: "slate",
    });
  }

  return cableCards.slice(0, 3);
}

export const electricDef: CalculatorDefinition = {
  id: "engineering_electrics",
  slug: "elektrika",
  title: "Калькулятор электропроводки",
  h1: "Калькулятор электропроводки онлайн — расчёт кабеля и автоматов",
  description: "Рассчитайте метраж кабеля, количество автоматических выключателей, устройств защитного отключения (УЗО) и розеток для квартиры или дома.",
  metaTitle: withSiteMetaTitle("Калькулятор электропроводки: материалы онлайн"),
  metaDescription: "Бесплатный калькулятор электропроводки: рассчитайте кабель ВВГнг(А)-LS, автоматы, УЗО и розетки для квартиры или дома по площади и количеству комнат.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["электропроводка", "кабель ВВГнг", "автоматы", "УЗО", "розетки", "электрика"],
  popularity: 72,
  complexity: 2,
  fields: [
    {
      key: "apartmentArea",
      label: "Площадь квартиры / дома",
      type: "slider",
      unit: "м²",
      min: 20,
      max: 500,
      step: 5,
      defaultValue: 60,
    },
    {
      key: "roomsCount",
      label: "Количество комнат",
      type: "slider",
      unit: "шт",
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 3,
    },
    {
      key: "ceilingHeight",
      label: "Высота потолков",
      type: "slider",
      unit: "м",
      min: 2.4,
      max: 4,
      step: 0.1,
      defaultValue: 2.7,
    },
    {
      key: "wiringType",
      label: "Тип разводки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Скрытая (в штробах / стяжке)" },
        { value: 1, label: "Открытая (в кабель-канале)" },
      ],
    },
    {
      key: "hasKitchen",
      label: "Есть кухня с электроплитой",
      type: "switch",
      defaultValue: 1,
      hint: "Требует отдельной линии. Для однофазного подключения ориентир — 220 В и 32 А; трёхфазную схему рассчитывают отдельно.",
    },
    {
      key: "cablePurchaseMode",
      label: "Как продаётся кабель",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Отрез по метрам" },
        { value: 1, label: "Бухты по 50 м" },
      ],
      hint: "Выберите реальный формат у поставщика. Каждое сечение округляется отдельно.",
    },
    {
      key: "reserve",
      label: "Запас кабеля",
      type: "slider",
      unit: "%",
      min: 5,
      max: 30,
      step: 5,
      defaultValue: 15,
      hint: "На спуски к розеткам, петли в коробках и ошибки монтажа",
    },
  ],
  calculate(inputs) {
    const spec = electricSpec as any;
    const canonical = computeCanonicalElectric(spec, inputs);

    return {
      materials: canonical.materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
      accuracyMode: canonical.accuracyMode,
      accuracyExplanation: canonical.accuracyExplanation,
      summaryCards: buildElectricSummaryCards(
        canonical.materials,
        canonical.totals.panelModules,
      ),
      hidePrimaryMaterialBadge: true,
    };
  },
  formulaDescription: `
**Предварительный расчёт электропроводки:**

1. **Метраж кабеля**:
   - Розетки: S_пола × 1.6 + ориентировочные спуски по числу групп.
   - Свет: S_пола × 1.1 + ориентировочные спуски по числу групп.
2. **Запас**: выбранные 5–30% на петли в подрозетниках, коробках, щите и монтажные отклонения.
3. **Покупка кабеля**: каждое сечение округляется отдельно — до целого метра или бухты 50 м по выбранному режиму.
4. **Группы и аппараты защиты**: количество оценивается по площади и комнатам как стартовая ведомость, а не как готовый проект щита.
5. **Границы применимости**: сечения, номиналы, УЗО/дифавтоматы, одно- или трёхфазный ввод проверяют по нагрузкам, длинам линий, системе заземления и техническим условиям.

Коэффициенты 1,1 и 1,6 м кабеля на м², число точек и групп — проектные допущения калькулятора, а не нормативные пределы.
  `,
  howToUse: [
    "Введите общую площадь объекта",
    "Укажите количество жилых комнат",
    "Выберите наличие электроплиты — она добавляет ориентир отдельной линии 3×6 мм²",
    "Укажите, продаёт ли поставщик кабель по метрам или бухтами по 50 м",
    "Укажите запас (рекомендуем 15-20% для новичков)",
    "Нажмите «Рассчитать» — получите список материалов для чернового монтажа",
  ],
  expertTips: [
    {
      title: "Кабель и документы",
      content:
        "Марка и исполнение кабеля должны соответствовать проекту и условиям прокладки. При покупке проверьте изготовителя, маркировку, документы о соответствии и фактический метраж партии.",
    },
    {
      title: "Соединения и доступность",
      content: "Способ соединения проводников и необходимость доступа к соединениям задают проект, применяемая система и требования производителя. Не скрывайте непроверенные соединения в необслуживаемой полости.",
    }
  ],
  faq: [
    {
      question: "Зачем нужно УЗО?",
      answer:
        "Для защиты человека и снижения риска пожара при утечке тока. Автомат защищает линию от перегрузки и короткого замыкания, а устройство защитного отключения (УЗО) — от токов утечки, поэтому они работают в паре, а не заменяют друг друга.",
    },
    {
      question: "Можно ли класть кабель без гофры?",
      answer:
        "Зависит от основания и способа прокладки. В штробе под штукатуркой иногда допускают без гофры, но в скрытых полостях, под потолками и особенно в деревянных конструкциях защита (гофра/труба) обычно обязательнее: это и пожарная безопасность, и ремонтопригодность.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта электропроводки</h2>
<p>Метраж кабеля рассчитывается по площади и количеству групп:</p>
<p><strong>L<sub>розетки</sub> = (S &times; 1.6 + N<sub>групп</sub> &times; H &times; 1.5) &times K<sub>запаса</sub></strong></p>
<p><strong>L<sub>свет</sub> = (S &times; 1.1 + N<sub>групп</sub> &times; H) &times K<sub>запаса</sub></strong></p>
<ul>
  <li><strong>S</strong> — площадь квартиры/дома (м&sup2;)</li>
  <li><strong>N<sub>групп</sub></strong> — расчётное количество групп освещения или розеток</li>
  <li><strong>H</strong> — введённая высота помещения</li>
  <li><strong>K<sub>запаса</sub></strong> — выбранные пользователем 5–30% на петли, коробки, щит и монтажные отклонения</li>
</ul>
<p>Это ориентировочная ведомость по площади и числу групп, а не трассировка по плану. Коэффициенты 1,1 и 1,6 м/м&sup2;, число групп и точек — проектные допущения калькулятора, а не нормативные пределы. Кабель каждого сечения округляется к покупке отдельно: до целого метра или бухты 50 м по выбранному режиму.</p>

<h2>Сечение кабеля по назначению</h2>
<table>
  <thead>
    <tr><th>Назначение</th><th>Кабель</th><th>Автомат</th><th>Примечание</th></tr>
  </thead>
  <tbody>
    <tr><td>Освещение</td><td>ВВГнг(А)-LS 3&times;1,5</td><td>10 А</td><td>Одна группа на 1–2 комнаты</td></tr>
    <tr><td>Розетки</td><td>ВВГнг(А)-LS 3&times;2,5</td><td>16 А</td><td>Одна группа на 1 комнату</td></tr>
    <tr><td>Кондиционер</td><td>По паспорту оборудования</td><td>По нагрузке</td><td>Отдельная линия</td></tr>
    <tr><td>Электроплита</td><td>Ориентир: ВВГнг(А)-LS 3&times;6</td><td>Ориентир: 32 А</td><td>Для однофазного подключения</td></tr>
    <tr><td>Стиральная машина</td><td>ВВГнг(А)-LS 3&times;2,5</td><td>16 А + УЗО</td><td>Отдельная линия</td></tr>
  </tbody>
</table>

<h2>Нормативная база</h2>
<p>Границы проектирования электроустановок жилых и общественных зданий задаёт действующий <a href="https://protect.gost.ru/sp/details/27f20b47-7456-496e-9e1d-8011ddb4a956" target="_blank" rel="noopener noreferrer"><strong>СП 256.1325800.2016</strong></a> с действующим с 26 января 2026 года <a href="https://protect.gost.ru/sp/changesdetails/d438f64b-92ac-4527-8548-9b68adacfc66" target="_blank" rel="noopener noreferrer">изменением № 9</a>; защиту от поражения током рассматривает <a href="https://protect.gost.ru/gost/details/ce4bedcf-0ab7-43a7-9f3e-cab5a14e6580" target="_blank" rel="noopener noreferrer"><strong>ГОСТ Р 50571.4.41-2022</strong></a>, а пожарную безопасность кабельных изделий — <a href="https://protect.gost.ru/gost/details/1ec12685-51c3-482f-aa46-84d87e03a378" target="_blank" rel="noopener noreferrer"><strong>ГОСТ 31565-2012</strong></a>. Эти документы не превращают расчёт по площади в электропроект: сечения кабелей, аппараты защиты, способ прокладки и схему ввода выбирают по нагрузкам и условиям объекта.</p>

<h2>Обязательные элементы электрощита</h2>
<ul>
  <li><strong>Вводной автомат</strong> — 32–50 А (по мощности ввода)</li>
  <li><strong>УЗО или дифавтоматы</strong> — тип, ток и уставку определяют по проекту и условиям конкретной линии</li>
  <li><strong>Автоматы</strong> — по одному на каждую группу</li>
  <li><strong>Реле напряжения</strong> — защита от скачков (рекомендуется)</li>
  <li><strong>Шина заземления</strong> — обязательна для системы TN-C-S, где рабочий ноль и защитный проводник разделены</li>
</ul>
`,
    faq: [
      {
        question: "Сколько метров кабеля нужно на квартиру 60 м²?",
        answer: "<p>При введённых 60 м&sup2;, 3 комнатах, высоте 2,7 м, электроплите и запасе 15% калькулятор оценивает:</p><ul><li><strong>3&times;2,5 мм&sup2;</strong> — около 133,7 м, к покупке 134 м</li><li><strong>3&times;1,5 мм&sup2;</strong> — около 88,3 м, к покупке 89 м</li><li><strong>3&times;6 мм&sup2;</strong> — около 17,2 м, к покупке 18 м</li></ul><p>Итого по режиму «отрез по метрам» — 241 м кабеля разных сечений. Это предварительная оценка: точные трассы, число групп и аппараты защиты определяют по плану и нагрузкам.</p>",
      },
      {
        question: "Нужно ли УЗО в квартире и сколько штук?",
        answer: "<p>УЗО снижает риск поражения током при утечке, но не заменяет автомат защиты от перегрузки и короткого замыкания. Количество устройств, их тип, номинальный ток и уставку нельзя достоверно вывести только из площади квартиры: нужны схема групп, система заземления, условия помещений и расчёт нагрузок. В проекте могут применяться отдельные УЗО с автоматами или дифавтоматы.</p>",
      },
      {
        question: "Какой кабель использовать для проводки в квартире?",
        answer: "<p>Для стационарной проводки в жилых помещениях обычно выбирают медный кабель <strong>ВВГнг(А)-LS</strong>: маркировка LS означает пониженное дымо- и газовыделение.</p><ul><li><strong>3&times;1,5 мм&sup2;</strong> — типовой ориентир для освещения с автоматом 10 А</li><li><strong>3&times;2,5 мм&sup2;</strong> — типовой ориентир для розеток с автоматом 16 А</li><li><strong>3&times;6 мм&sup2;</strong> — возможный вариант однофазной линии электроплиты с автоматом 32 А</li></ul><p>Для кондиционера, бойлера, духовки и другой мощной техники сечение и автомат выбирают по паспортной мощности, длине линии и способу прокладки. Гибкие шнуры ПВС и ШВВП не следует подменять ими кабель стационарной скрытой проводки.</p>",
      },
    ],
  },
};
