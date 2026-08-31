import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalSepticRings } from "../../../../engine/septic-rings";
import { DEFAULT_ACCURACY_MODE } from "../../../../engine/accuracy";
import septicRingsSpec from "../../../../configs/calculators/septic-rings-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

const formatRuNumber = (value: number): string => new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 3,
}).format(value);

const clampInteger = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

const formatChamberCount = (count: number): string =>
  `${count} ${pluralRu(count, "герметичная камера", "герметичные камеры", "герметичных камер")}`;

export const septicRingsDef: CalculatorDefinition = {
  id: "engineering_septic_rings",
  slug: "septik-iz-kolets",
  title: "Калькулятор септика из железобетонных колец",
  h1: "Калькулятор септика из железобетонных колец — расчёт материалов",
  description: "Проверьте минимальный рабочий объём и геометрическое число колец КС-10/15/20, днищ, перекрытий и прямых отрезков трубы. Фильтрация и узлы — только по проекту.",
  metaTitle: withSiteMetaTitle("Калькулятор септика из железобетонных колец"),
  metaDescription: "Бесплатный калькулятор септика из ЖБИ-колец: рассчитайте минимальный рабочий объём и проверьте геометрическое число колец без подмены проекта фильтрации.",
  category: "engineering",
  categorySlug: "inzhenernye",
  tags: ["септик", "септик из колец", "ЖБИ кольца", "септик частного дома", "расчёт септика"],
  popularity: 60,
  complexity: 2,
  fields: [
    {
      key: "residents",
      label: "Количество проживающих",
      type: "slider",
      unit: "чел",
      min: 1,
      max: 20,
      step: 1,
      defaultValue: 4,
      hint: "В предварительной модели принято 200 л/чел·сут. Для проекта используйте расчётный суточный приток по фактическому водопотреблению и оборудованию дома.",
    },
    {
      key: "chambersCount",
      label: "Число герметичных камер септика",
      type: "select",
      defaultValue: 3,
      options: [
        { value: 1, label: "1 камера — при притоке не более 1 м³/сут" },
        { value: 2, label: "2 камеры — при притоке не более 10 м³/сут" },
        { value: 3, label: "3 камеры — свыше 10 м³/сут или по проекту" },
      ],
      hint: "Фильтрующий колодец не является камерой септика и не входит в его рабочий объём.",
      fullWidth: true,
    },
    {
      key: "ringDiameter",
      label: "Диаметр колец",
      type: "select",
      defaultValue: 1000,
      options: [
        { value: 1000, label: "Ø1000 мм (КС-10-9, полный объём 0,71 м³)" },
        { value: 1500, label: "Ø1500 мм (КС-15-9, полный объём 1,59 м³)" },
        { value: 2000, label: "Ø2000 мм (КС-20-9, полный объём 2,83 м³)" },
      ],
      hint: "Полный геометрический объём кольца больше рабочего: уровни входа/выхода, свободный объём и зона осадка задаются проектом.",
      fullWidth: true,
    },
    {
      key: "groundType",
      label: "Тип грунта",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "Песок/супесь — нужен коэффициент фильтрации и УГВ" },
        { value: 1, label: "Суглинок — нужен отдельный фильтрационный расчёт" },
        { value: 2, label: "Глина — колодец без расчёта не применять" },
      ],
      hint: "Название грунта не заменяет инженерно-геологические данные, коэффициент фильтрации и расчётный уровень грунтовых вод.",
      fullWidth: true,
    },
    {
      key: "withFilterWell",
      label: "Отдельное сооружение фильтрации",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 1, label: "Нужен фильтрующий колодец — считать отдельно" },
        { value: 0, label: "Не включать фильтрующее сооружение" },
      ],
      hint: "Калькулятор не назначает размеры, перфорацию, донный фильтр и обсыпку фильтрующего колодца.",
      fullWidth: true,
    },
    {
      key: "pipeLengthFromHouse",
      label: "Длина трубы от дома",
      type: "slider",
      unit: "м",
      min: 2,
      max: 50,
      step: 1,
      defaultValue: 8,
      hint: "Считается только прямой метраж отрезков по 3 м. Уклон, отметки, повороты, вводы и смотровые колодцы определяются трассой.",
    },
  ],
  calculate(inputs) {
    const spec = septicRingsSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalSepticRings(spec, inputs, factorTable);
    const accuracyMode = canonical.accuracyMode ?? DEFAULT_ACCURACY_MODE;

    const residents = clampInteger(Number(inputs.residents ?? 4), 1, 20);
    const chambersCount = clampInteger(Number(inputs.chambersCount ?? 3), 1, 3);
    const requestedDiameter = Number(inputs.ringDiameter ?? 1000);
    const ringDiameter = requestedDiameter >= 1750 ? 2000 : requestedDiameter >= 1250 ? 1500 : 1000;
    const groundType = clampInteger(Number(inputs.groundType ?? 1), 0, 2);
    const withFilterWell = clampInteger(Number(inputs.withFilterWell ?? 1), 0, 1);
    const pipeLengthFromHouse = Math.max(2, Math.min(50, Number(inputs.pipeLengthFromHouse ?? 8)));

    const dailyVolumeLiters = residents * Number(spec.material_rules.liters_per_person_per_day);
    const dailyVolumeM3 = dailyVolumeLiters / 1000;
    const retentionMultiplier = dailyVolumeM3 <= 5 ? 3 : 2.5;
    const requiredWorkingVolumeM3 = Math.round(
      Math.max(2.4, dailyVolumeM3 * retentionMultiplier) * 1000,
    ) / 1000;
    const requiredVolumePerChamberM3 = requiredWorkingVolumeM3 / chambersCount;
    const ringVolumeM3 = Number(spec.material_rules.ring_volumes_m3[String(ringDiameter)]);
    const ringsPerChamber = Math.ceil(requiredVolumePerChamberM3 / ringVolumeM3);
    const totalRings = ringsPerChamber * chambersCount;
    const bottomPlates = chambersCount;
    const topPlates = chambersCount;
    const pipeSectionM = Number(spec.material_rules.pipe_section_m);
    const pipeSections = Math.ceil(pipeLengthFromHouse / pipeSectionM);
    const bottomPlateLabel = spec.material_rules.well_floor_plates[String(ringDiameter)] as string;
    const topPlateLabel = spec.material_rules.well_top_plates[String(ringDiameter)] as string;
    const ringLabel = `КС-${ringDiameter / 100}-9 (Ø${ringDiameter} мм, h=900 мм)`;

    const materials = [
      {
        name: `${ringLabel} — геометрический минимум`,
        quantity: totalRings,
        unit: "шт",
        withReserve: totalRings,
        purchaseQty: totalRings,
        category: "Предварительная геометрия",
        subtitle: `${formatChamberCount(chambersCount)} × ${ringsPerChamber} ${pluralRu(ringsPerChamber, "кольцо", "кольца", "колец")}. Полный объём кольца ${formatRuNumber(ringVolumeM3)} м³; рабочие уровни и фактическую высоту жидкости должен подтвердить проект`,
      },
      {
        name: `Днище ${bottomPlateLabel} — предварительно`,
        quantity: bottomPlates,
        unit: "шт",
        withReserve: bottomPlates,
        purchaseQty: bottomPlates,
        category: "Герметичные камеры",
        subtitle: "По одному днищу на каждую герметичную камеру. Исполнение, стык, основание и монтаж проверяются по проекту и паспорту ЖБИ",
      },
      {
        name: `Плита перекрытия ${topPlateLabel} — предварительно`,
        quantity: topPlates,
        unit: "шт",
        withReserve: topPlates,
        purchaseQty: topPlates,
        category: "Герметичные камеры",
        subtitle: "По одной плите на камеру. Горловины, доборные кольца, люки, нагрузки и отметки поверхности не рассчитаны",
      },
      {
        name: `Канализационная труба Ø${spec.material_rules.pipe_diameter_mm} мм, отрезки ${pipeSectionM} м — прямая трасса`,
        quantity: pipeSections,
        unit: "шт",
        withReserve: pipeSections,
        purchaseQty: pipeSections,
        category: "Трубопровод",
        subtitle: `ceil(${formatRuNumber(pipeLengthFromHouse)} м / ${formatRuNumber(pipeSectionM)} м) = ${pipeSections} шт. Повороты, тройники, вводы, уклон, отметки и колодцы не назначаются`,
      },
    ];

    const scenario = {
      exact_need: totalRings,
      purchase_quantity: totalRings,
      leftover: 0,
      assumptions: [
        `formula_version:${canonical.formulaVersion}`,
        `working_volume_m3:${requiredWorkingVolumeM3}`,
        `sealed_chambers:${chambersCount}`,
        `ring_diameter_mm:${ringDiameter}`,
        "filter_well_separate:true",
      ],
      key_factors: { field_multiplier: 1 },
      buy_plan: {
        package_label: `septic-ring-${ringDiameter}`,
        package_size: 1,
        packages_count: totalRings,
        unit: "шт",
      },
    };

    const warnings = [
      `Это предварительная геометрическая проверка. ${totalRings} ${pluralRu(totalRings, "кольцо", "кольца", "колец")} получены по полному объёму цилиндров; рабочие уровни входа/выхода, свободный объём, иловая зона, устойчивость, водонепроницаемость и монтаж ЖБИ калькулятор не проектирует.`,
      `Минимальный рабочий объём принят ${formatRuNumber(requiredWorkingVolumeM3)} м³: max(${retentionMultiplier} × ${formatRuNumber(dailyVolumeM3)} м³/сут, 2,4 м³). Фактический расчётный приток может отличаться от фиксированных 200 л/чел·сут.`,
      "MIN/REC/MAX не добавляют запас к кольцам: число конструктивных элементов нельзя менять общими коэффициентами отходов или сложности.",
      "Гидроизоляция, уплотнения стыков, горловины, люки и фасонные части трубы исключены из автоматического заказа: нужны выбранные изделия, отметки и проект узлов.",
    ];

    if (dailyVolumeM3 <= 1 && chambersCount !== 1) {
      warnings.push(`При притоке ${formatRuNumber(dailyVolumeM3)} м³/сут ГОСТ Р 70818-2023 указывает однокамерный септик. ${formatChamberCount(chambersCount)} оставлены только как выбранная проектная схема, а не рекомендация калькулятора.`);
    } else if (dailyVolumeM3 > 1 && dailyVolumeM3 <= 10 && chambersCount !== 2) {
      warnings.push(`При притоке ${formatRuNumber(dailyVolumeM3)} м³/сут ГОСТ Р 70818-2023 указывает двухкамерный септик. Выбрано: ${formatChamberCount(chambersCount)}; схема требует проектного обоснования.`);
    } else if (dailyVolumeM3 > 10 && chambersCount !== 3) {
      warnings.push(`При притоке ${formatRuNumber(dailyVolumeM3)} м³/сут ГОСТ Р 70818-2023 указывает трёхкамерный септик.`);
    }

    if (withFilterWell === 1) {
      warnings.push("Фильтрующий колодец считается отдельным сооружением после септика и не уменьшает его рабочий объём. Его кольца, перфорация, донный фильтр и обсыпка не рассчитаны: нужны расход, коэффициент фильтрации грунта и расчётный уровень грунтовых вод.");
      if (groundType === 2) {
        warnings.push("Для глинистого грунта нельзя назначать фильтрующий колодец по названию грунта. Нужны инженерно-геологические данные и выбор подходящего сооружения подземной фильтрации.");
      }
    }

    if (pipeLengthFromHouse > 12) {
      warnings.push(`Длина выпуска ${formatRuNumber(pipeLengthFromHouse)} м превышает 12 м для Ø100 мм: ГОСТ Р 70818-2023 требует предусмотреть дополнительные смотровые колодцы. Их число и расположение определяются трассой.`);
    }

    const practicalNotes = [
      `Расчётный суточный приток модели: ${formatRuNumber(dailyVolumeLiters)} л/сут.`,
      `Минимальный рабочий объём: ${formatRuNumber(requiredWorkingVolumeM3)} м³ при очистке септика не реже одного раза в год.`,
      `Камеры приняты равными как предварительная модульная схема: по ${formatRuNumber(requiredVolumePerChamberM3)} м³ рабочего объёма на камеру.`,
      withFilterWell === 1
        ? "Фильтрующий колодец показан только как отдельная проектная потребность и не включён в ведомость материалов."
        : "Сооружение подземной фильтрации или схема накопления/откачки в этом запуске не подбираются.",
    ];

    const totals = {
      residents,
      chambersCount,
      ringDiameter,
      groundType,
      withFilterWell,
      pipeLengthFromHouse,
      dailyVolumeLiters,
      totalVolumeLiters: requiredWorkingVolumeM3 * 1000,
      totalVolume: requiredWorkingVolumeM3,
      volumePerChamber: requiredVolumePerChamberM3,
      ringsPerChamber,
      totalRings,
      bottomPlates,
      topPlates,
      sealedChambers: chambersCount,
      pipeWithReserveM: pipeLengthFromHouse,
      pipeSections,
      minExactNeed: totalRings,
      recExactNeed: totalRings,
      maxExactNeed: totalRings,
      minPurchase: totalRings,
      recPurchase: totalRings,
      maxPurchase: totalRings,
    };

    return {
      materials,
      totals,
      warnings,
      scenarios: {
        MIN: { ...scenario, assumptions: [...scenario.assumptions, "scenario:MIN"] },
        REC: { ...scenario, assumptions: [...scenario.assumptions, "scenario:REC"] },
        MAX: { ...scenario, assumptions: [...scenario.assumptions, "scenario:MAX"] },
      },
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
      accuracyMode,
      accuracyExplanation: {
        mode: accuracyMode,
        modeLabel: canonical.accuracyExplanation.modeLabel,
        combinedMultiplier: 1,
        appliedModifiers: [],
        notes: ["Режим точности не меняет число колец, днищ, перекрытий и прямых отрезков трубы."],
      },
      summaryCards: [
        {
          icon: "📐",
          label: "Минимальный рабочий объём",
          value: formatRuNumber(requiredWorkingVolumeM3),
          unit: "м³",
          hint: "ГОСТ Р 70818-2023, без уменьшения на фильтрующий колодец",
          tone: "violet",
        },
        {
          icon: "◯",
          label: "Геометрический минимум",
          value: String(totalRings),
          unit: pluralRu(totalRings, "кольцо", "кольца", "колец"),
          hint: `${formatChamberCount(chambersCount)}; рабочие уровни проверяет проект`,
          tone: "amber",
        },
        {
          icon: "💧",
          label: "Подземная фильтрация",
          value: withFilterWell === 1 ? "Отдельно" : "Не выбрана",
          hint: "Не входит в рабочий объём и ведомость септика",
          tone: "slate",
        },
      ],
      hidePrimaryMaterialBadge: true,
    };
  },
  formulaDescription: `
**Предварительная проверка септика из железобетонных колец:**
- Суточный приток модели = жители × 200 л/чел·сут. Для проекта нужен фактический расчётный приток.
- Минимальный рабочий объём = max(3 × суточный приток, 2,4 м³) при расходе до 5 м³/сут; свыше 5 м³/сут применяется 2,5-кратный приток.
- Геометрический минимум колец = число камер × ceil((рабочий объём / число камер) / полный объём кольца).
- Фильтрующий колодец не является камерой септика, не уменьшает его рабочий объём и рассчитывается отдельно.
- MIN/REC/MAX не меняют число колец. Гидроизоляция, стыки, горловины, люки, фасонные части и сооружение фильтрации автоматически не назначаются.
  `,
  howToUse: [
    "Введите число постоянно проживающих и проверьте, соответствует ли допущение 200 л/чел·сут вашему расчётному водоотведению",
    "Выберите число именно герметичных камер септика; фильтрующий колодец сюда не входит",
    "Выберите диаметр колец и воспринимайте результат как геометрический минимум до назначения рабочих уровней",
    "Укажите грунт только для предупреждения: коэффициент фильтрации и уровень грунтовых вод нужны отдельно",
    "Отметьте потребность в фильтрующем сооружении — его материалы калькулятор не подбирает",
    "Введите длину прямой трассы от дома; повороты, отметки и смотровые колодцы добавляет проектировщик",
  ],
  faq: [
    {
      question: "Как определяется минимальный рабочий объём септика?",
      answer:
        "При расходе до 5 м³/сут ГОСТ Р 70818-2023 требует не менее трёхкратного суточного притока, а суммарный объём отстойной и иловой частей — не менее 2,4 м³. Калькулятор использует 200 л/чел·сут только как предварительное допущение; фактический проектный приток может отличаться.",
    },
    {
      question: "Входит ли фильтрующий колодец в рабочий объём септика?",
      answer:
        "Нет. Септик и сооружение подземной фильтрации — разные части автономной канализации. Фильтрующий колодец устанавливается после септика и не может заменять герметичную камеру или уменьшать требуемый рабочий объём отстойной части.",
    },
    {
      question: "Можно ли заказывать кольца по числу из калькулятора?",
      answer:
        "Только после проверки проекта. Калькулятор делит минимальный рабочий объём между равными модульными камерами и использует полный геометрический объём кольца. Реальный рабочий объём меньше и зависит от отметок входа и перелива, свободного объёма, иловой зоны и исполнения стыков.",
    }
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что проверяет калькулятор септика из ЖБИ-колец</h2>
<p>Калькулятор даёт предварительную геометрическую оценку герметичной отстойной части: минимальный рабочий объём, равное число колец в выбранных модульных камерах, днища, перекрытия и прямые отрезки трубы по 3 м.</p>
<p>Расчёт не назначает конструкцию, рабочие уровни, переливы, вентиляцию, водонепроницаемость, защиту от всплытия, основание, котлован, люки, горловины, гидроизоляционные продукты и сооружение подземной фильтрации. Эти решения зависят от проекта, ЖБИ конкретного производителя, грунтов и расчётного уровня грунтовых вод.</p>

<h2>Минимальный рабочий объём</h2>
<p>В модели суточный приток предварительно оценивается как <strong>Q = N × 0,2 м³/сут</strong>. Фактический проектный расход следует определять по водопотреблению и установленному оборудованию.</p>
<p>По <a href="https://protect.gost.ru/gost/details/00dced5b-5991-4f1a-9516-1f88c4ad53f6" target="_blank" rel="noopener noreferrer">ГОСТ Р 70818-2023</a>:</p>
<ul>
  <li>при Q до 5 м³/сут рабочий объём должен быть не менее трёхкратного суточного притока;</li>
  <li>при Q свыше 5 м³/сут — не менее 2,5-кратного;</li>
  <li>суммарный объём отстойной и иловой частей в любом случае должен быть не менее 2,4 м³.</li>
</ul>
<p><strong>V<sub>min</sub> = max(k × Q, 2,4 м³)</strong>. Порог относится к расходу в м³/сут, а не к числу жителей.</p>

<h2>Как получено число колец</h2>
<p>Выбранное число камер относится только к герметичному септику. Для предварительной модульной схемы рабочий объём делится между камерами поровну:</p>
<p><strong>n<sub>кам</sub> = &lceil;(V<sub>min</sub> / m) / V<sub>кольца, полный</sub>&rceil;</strong></p>
<p><strong>n<sub>всего</sub> = m × n<sub>кам</sub></strong></p>
<p>Объёмы 0,71 / 1,59 / 2,83 м³ — это полный геометрический объём цилиндра высотой 0,9 м, а не подтверждённый рабочий объём камеры. Марки и исполнение сборных элементов проверяйте по действующему <a href="https://protect.gost.ru/gost/details/2bde3665-9b67-4026-a77e-ea8318e89d63" target="_blank" rel="noopener noreferrer">ГОСТ 8020-2016</a> и каталогу производителя.</p>

<h2>Септик и фильтрующий колодец — разные сооружения</h2>
<p>Фильтрующий колодец находится после септика и не входит в рабочий объём отстойных камер. Поэтому его включение не уменьшает число герметичных камер, днищ или требуемый рабочий объём.</p>
<p>Калькулятор не выдаёт щебень и песок по одному диаметру кольца. По ГОСТ Р 70818-2023 фильтрующая поверхность зависит от дна и перфорированных стен, а конструкция — от суточной нагрузки, коэффициента фильтрации, типа грунта и расчётного уровня грунтовых вод. Названия «песок», «суглинок» или «глина» для такого заказа недостаточно.</p>

<h2>Что не входит в ведомость</h2>
<table>
  <thead>
    <tr><th>Позиция</th><th>Почему не назначается автоматически</th></tr>
  </thead>
  <tbody>
    <tr><td>Горловины и люки</td><td>Число доборных колец зависит от отметок перекрытия и поверхности, а тип люка — от нагрузки и места установки.</td></tr>
    <tr><td>Уплотнения и гидроизоляция</td><td>Нужны конструкция стыка, паспорт ЖБИ, проект водонепроницаемости и совместимая система материалов.</td></tr>
    <tr><td>Переливы, тройники и вентиляция</td><td>Требуются рабочие уровни, отметки труб и схема движения стоков и воздуха.</td></tr>
    <tr><td>Фильтрующий колодец, поле или кассета</td><td>Выбираются и рассчитываются отдельно по грунтам, УГВ и гидравлической нагрузке.</td></tr>
  </tbody>
</table>
`,
    faq: [
      {
        question: "Почему для одного жителя получается минимум 2,4 м³?",
        answer: "<p>ГОСТ Р 70818-2023 задаёт не только кратность суточного притока, но и отдельный нижний предел: суммарный объём отстойной и иловой частей септика должен быть не менее 2,4 м³ независимо от расхода. Поэтому результат для малого дома не может уменьшаться до 0,6 м³.</p>"
      },
      {
        question: "Почему калькулятор не добавляет щебень для фильтрующего колодца?",
        answer: "<p>Фиксированный слой по площади дна не является расчётом сооружения фильтрации. Нужны суточная нагрузка, коэффициент фильтрации, расчётный уровень грунтовых вод, площадь дна и перфорированных стен, наружная обсыпка и подходящий тип сооружения. Поэтому щебень и песок без этих данных исключены из ведомости.</p>"
      },
      {
        question: "Зачем проверять длину выпуска от дома?",
        answer: "<p>Для выпуска диаметром 100 мм ГОСТ Р 70818-2023 ограничивает длину до первого сооружения 12 м. При большей длине предусматривают дополнительные смотровые колодцы. Калькулятор показывает предупреждение, но не назначает их число и места без трассы и высотных отметок.</p>"
      },
      {
        question: "Почему MIN, REC и MAX показывают одинаковое число колец?",
        answer: "<p>Потому что конструктивные элементы не получают запас на подрезку, навык мастера или сложность геометрии. Изменить число колец можно только после изменения расчётного притока, рабочего объёма, диаметра, числа камер или проектных рабочих уровней.</p>"
      }
    ]
  }
};
