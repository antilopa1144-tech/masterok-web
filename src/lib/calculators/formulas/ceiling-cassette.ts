import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { buildNativeScenarios } from "../scenario-native";

export const ceilingCassetteDef: CalculatorDefinition = {
  id: "ceilings_cassette",
  slug: "kassetnyi-potolok",
  title: "Калькулятор кассетного потолка",
  h1: "Калькулятор кассетного потолка онлайн — расчёт кассет и профилей",
  description: "Рассчитайте количество кассет (600×600 или 595×595 мм), несущих профилей и подвесов для кассетного подвесного потолка.",
  metaTitle: withSiteMetaTitle("Калькулятор кассетного потолка | Расчёт кассет Armstrong"),
  metaDescription: "Бесплатный калькулятор кассетного потолка Armstrong: рассчитайте кассеты 600×600, профили Т-24, подвесы и крепёж по площади помещения.",
  category: "ceiling",
  categorySlug: "potolki",
  tags: ["кассетный потолок", "кассеты 600x600", "Armstrong", "Т-24", "подвесной потолок"],
  popularity: 58,
  complexity: 2,
  fields: [
    {
      key: "area",
      label: "Площадь потолка",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "cassetteSize",
      label: "Размер кассеты",
      type: "select",
      defaultValue: 600,
      options: [
        { value: 595, label: "595×595 мм (Т-24)" },
        { value: 600, label: "600×600 мм (открытый)" },
        { value: 300, label: "300×300 мм (декоративные)" },
      ],
    },
    {
      key: "roomLength",
      label: "Длина помещения",
      type: "slider",
      unit: "м",
      min: 2,
      max: 50,
      step: 0.5,
      defaultValue: 5,
    },
  ],
  calculate(inputs): import("../types").CalculatorResult {
    const area = Math.max(1, inputs.area ?? 20);
    const cassetteSize = inputs.cassetteSize ?? 600; // мм
    const cassetteSizeM = cassetteSize / 1000;
    const roomLength = Math.max(2, inputs.roomLength ?? 5);
    const roomWidth = area / roomLength;

    // Кассеты: +10% на подрезку крайних рядов
    const cassettesPerRow = Math.ceil(roomLength / cassetteSizeM);
    const rows = Math.ceil(roomWidth / cassetteSizeM);
    const totalCassettes = cassettesPerRow * rows;
    const cassettesWithReserve = Math.ceil(totalCassettes * 1.1);

    // Главный несущий профиль (1200 мм, монтируется через 1200 мм)
    const mainSpacing = 1.2;
    const mainRows = Math.ceil(roomWidth / mainSpacing) + 1;
    const mainProfileLength = 1.2; // м
    const mainProfilePcs = Math.ceil((mainRows * roomLength) / mainProfileLength);

    // Поперечный профиль (600 мм), монтируется между главными
    const crossProfileLength = 0.6; // м
    const crossPerRow = Math.ceil(roomLength / crossProfileLength);
    const crossProfilePcs = Math.ceil(mainRows * crossPerRow * cassetteSizeM / crossProfileLength);

    // Подвесы: 1 на 1.2 м вдоль главного профиля
    const hangersPerMainRow = Math.ceil(roomLength / 1.2) + 1;
    const hangers = mainRows * hangersPerMainRow;

    const warnings: string[] = [];
    if (cassetteSize === 300) {
      warnings.push("Кассеты 300×300 требуют сдвоенной решётки профилей — умножьте количество профилей на 2");
    }
    if (area > 50) {
      warnings.push("Для больших площадей рекомендуйте устанавливать профили с шагом 600 мм для жёсткости");
    }

    const scenarios = buildNativeScenarios({
      id: "ceiling-cassette-main",
      title: "Ceiling cassette main",
      exactNeed: totalCassettes * 1.1,
      unit: "шт",
      packageSizes: [1],
      packageLabelPrefix: "ceiling-cassette",
    });

    return {
      materials: [
        {
          name: `Кассета ${cassetteSize}×${cassetteSize} мм`,
          quantity: totalCassettes,
          unit: "шт",
          withReserve: cassettesWithReserve,
          purchaseQty: cassettesWithReserve,
          category: "Кассеты",
        },
        {
          name: "Профиль несущий Т-24 (1200 мм)",
          quantity: mainProfilePcs,
          unit: "шт",
          withReserve: Math.ceil(mainProfilePcs * 1.05),
          purchaseQty: Math.ceil(mainProfilePcs * 1.05),
          category: "Профили",
        },
        {
          name: "Профиль поперечный Т-24 (600 мм)",
          quantity: crossProfilePcs,
          unit: "шт",
          withReserve: Math.ceil(crossProfilePcs * 1.05),
          purchaseQty: Math.ceil(crossProfilePcs * 1.05),
          category: "Профили",
        },
        {
          name: "Подвес прямой",
          quantity: hangers,
          unit: "шт",
          withReserve: Math.ceil(hangers * 1.1),
          purchaseQty: Math.ceil(hangers * 1.1),
          category: "Крепёж",
        },
        {
          name: "Профиль пристенный L-образный",
          quantity: Math.ceil((roomLength + roomWidth) * 2 * 1.05 / 3),
          unit: "шт (3 м)",
          withReserve: Math.ceil((roomLength + roomWidth) * 2 * 1.1 / 3),
          purchaseQty: Math.ceil((roomLength + roomWidth) * 2 * 1.1 / 3),
          category: "Профили",
        },
      ],
      totals: { area, totalCassettes, hangers } as Record<string, number>,
      warnings,
      scenarios,
    };
  },
  formulaDescription: `
**Расчёт кассетного потолка:**
- Кассет = Рядов × Кассет/ряд × 1.1
- Несущий профиль 1200 мм: через каждые 1.2 м
- Поперечный профиль 600 мм: заполняет ячейки решётки
  `,
  howToUse: [
    "Введите площадь потолка",
    "Выберите размер кассеты",
    "Укажите длину помещения",
    "Нажмите «Рассчитать»",
  ],
faq: [
    {
      question: "Какой запас брать на кассетный потолок?",
      answer: "Для кассетного потолка запас обычно закладывают не только на подрезку крайних кассет, но и на возможную замену повреждённых элементов при монтаже, подгонку вокруг светильников, вентиляции и других инженерных узлов. Чем сложнее геометрия помещения, больше выступов, колонн, люков и встроенного оборудования, тем осторожнее стоит считать запас, потому что крайние и примыкающие кассеты почти всегда приходится резать индивидуально, а добрать потом точно тот же модуль бывает не всегда просто для сохранения одинакового рисунка потолка, ровной сетки швов по всему полю, одинакового оттенка партии, совпадения микрорельефа поверхности, направления перфорации и типа кромки. Если потолок собирают в несколько этапов, запас особенно полезен именно на периферийных зонах и вокруг инженерии. На объектах с большим числом светильников и ревизий полезно сразу оставить несколько целых кассет именно под будущую замену после обслуживания инженерии. На потолках с большим числом светильников, вентиляции и ревизий полезно заранее держать запас именно целых кассет под замену после обслуживания инженерии. Обычно его закладывают не только на подрезку по периметру, но и на замену повреждённых кассет, добор у светильников и возможный пересорт по партии или оттенку. Если много подрезки по периметру и встроенных светильников, запас лучше брать ближе к верхней границе. На помещениях с колоннами, нишами и большим числом подрезок запас почти всегда нужен выше базового. Если кассеты нестандартного цвета или перфорации, резерв особенно полезен, потому что повторный добор той же партии часто затягивается."
    },
    {
      question: "Нужно ли считать профили и подвесы отдельно от кассет?",
      answer: "Да, кассеты — это только видимая часть подвесной системы, а основную несущую работу выполняют профили, подвесы, пристенные элементы и крепёж, которые нужно считать отдельно и не менее внимательно, чем сам декоративный слой. Если учитывать только кассеты, материала обычно не хватает уже на этапе сборки каркаса, когда становится понятно, сколько реально требуется направляющих, поперечных элементов и точек подвеса, особенно вокруг светильников, люков и вентиляционных врезок, где схема каркаса становится плотнее обычной. На таких потолках ошибка чаще всего возникает именно из-за недооценки несущей части системы, а не декоративных кассет, которые сами по себе проблему уже не закрывают. Для потолков с инженерией и врезками именно каркас почти всегда определяет реальную сложность и итоговую стоимость монтажа, а не только площадь кассет. Да, потому что именно каркас чаще всего даёт реальный перерасход на сложной геометрии, даже когда количество кассет визуально выглядит почти очевидным. Да, потому что расход каркаса зависит от схемы поля и инженерии, и на сложной геометрии именно он чаще всего уходит выше, чем ожидают по числу кассет. Обязательно, потому что именно каркас задаёт несущую схему потолка, а количество кассет само по себе не показывает расход направляющих, поперечин и подвесов. Да, потому что именно каркас задаёт несущую способность потолка и часто расходится с количеством самих кассет. Да, потому что именно каркас задаёт жёсткость и часто определяет заметную часть бюджета потолка. Именно по каркасу чаще всего возникает недобор, потому что визуально внимание уходит на сами кассеты, а не на несущую схему."
    }
  ],
};





