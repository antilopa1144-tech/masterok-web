import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalTileAdhesive } from "../../../../engine/tile-adhesive";
import tileadhesiveSpec from "../../../../configs/calculators/tile-adhesive-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";
import { buildManufacturerField, getManufacturerByIndex } from "../manufacturerField";

const tileAdhesiveManufacturerField = buildManufacturerField("tile_adhesive", {
  label: "Линейка клея (только подпись)",
  hint: "Название добавится к основной позиции. Паспортный расход, класс применения и фасовка конкретного продукта автоматически не загружаются.",
  fullWidth: true,
});

export const tileAdhesiveDef: CalculatorDefinition = {
  id: "mixes_tile_glue",
  slug: "klej-dlya-plitki",
  title: "Калькулятор плиточного клея",
  h1: "Калькулятор плиточного клея онлайн — расчёт расхода Ceresit, Knauf",
  description: "Рассчитайте количество плиточного клея по площади, размеру плитки и толщине нанесения. Ceresit CM, Knauf Флексклебер.",
  metaTitle: withSiteMetaTitle("Калькулятор плиточного клея: материалы онлайн"),
  metaDescription: "Бесплатный калькулятор плиточного клея: рассчитайте мешки Ceresit CM 11, CM 17, Knauf Флексклебер по площади, размеру плитки и толщине клеевого слоя.",
  category: "flooring",
  categorySlug: "poly",
  tags: ["плиточный клей", "Ceresit", "Knauf", "CM 11", "CM 17", "клей для плитки"],
  popularity: 70,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь укладки",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 500,
      step: 1,
      defaultValue: 20,
    },
    {
      key: "tileSize",
      label: "Размер плитки",
      type: "select",
      defaultValue: 1,
      options: [
        { value: 0, label: "до 30×30 см (мелкая)" },
        { value: 1, label: "30×60 — 45×45 см (средняя)" },
        { value: 2, label: "60×60 см (крупная)" },
        { value: 3, label: "60×120 см и более (крупноформат)" },
      ],
      hint: "Это четыре укрупнённых профиля модели, а не паспорт конкретного клея. Для категории 60×120 см и более модель автоматически применяет коэффициент 1,70.",
    },
    {
      key: "layingType",
      label: "Место укладки",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Пол (горизонтальная)" },
        { value: 1, label: "Стена (вертикальная)" },
        { value: 2, label: "Улица / тёплый пол (деформируемый клей)" },
      ],
      hint: "Фиксированные коэффициенты модели: пол ×1,00; стена ×0,85; улица или тёплый пол ×1,30. Они не заменяют техкарту выбранного клея.",
    },
    {
      key: "baseType",
      label: "Основание",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Стяжка, бетон" },
        { value: 1, label: "Гипсокартон, гипс" },
        { value: 2, label: "Старая плитка" },
      ],
      hint: "Для старой плитки модель применяет ×1,20. Подготовку, допустимость основания и тип грунта проверяют по техкарте системы.",
    },
    {
      key: "doubleApplicationRequired",
      label: "Двойное нанесение клея",
      type: "switch",
      defaultValue: 0,
      hint: "Ручное включение добавляет фиксированный множитель ×1,70. Для категории 60×120 см и более он применяется автоматически, поэтому переключатель скрыт.",
      hideIf: { key: "tileSize", op: "gte", value: 3 },
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 25,
      options: [
        { value: 5, label: "5 кг" },
        { value: 25, label: "25 кг" },
      ],
    },
    ...(tileAdhesiveManufacturerField ? [tileAdhesiveManufacturerField] : []),
  ],
  calculate(inputs) {
    const spec = tileadhesiveSpec as any;
    const factorTable = defaultFactorTables.factors as any;

    const manufacturer = getManufacturerByIndex("tile_adhesive", inputs.manufacturer);
    const publicInputs = inputs as Record<string, number>;
    const resolvedLaying = publicInputs.layingType ?? publicInputs.laying;
    const resolvedBase = publicInputs.baseType ?? publicInputs.base;

    const rawDoubleApp = (inputs as Record<string, unknown>).doubleApplicationRequired;
    let resolvedDoubleApp: boolean | undefined;
    if (typeof rawDoubleApp === "boolean") {
      resolvedDoubleApp = rawDoubleApp;
    } else if (typeof rawDoubleApp === "number" && rawDoubleApp > 0) {
      resolvedDoubleApp = true;
    } else {
      resolvedDoubleApp = undefined;
    }

    const canonical = computeCanonicalTileAdhesive(
      spec,
      {
        ...inputs,
        laying: resolvedLaying,
        base: resolvedBase,
        bagWeight: inputs.bagWeight,
        doubleApplicationRequired: resolvedDoubleApp,
        accuracyMode: inputs.accuracyMode as any,
      },
      factorTable
    );

    const appliedFactors = [
      resolvedLaying === 1 ? "стена ×0,85" : resolvedLaying === 2 ? "улица/тёплый пол ×1,30" : "пол ×1,00",
      resolvedBase === 2 ? "старая плитка ×1,20" : "основание ×1,00",
      canonical.totals.doubleApplication === 1 ? "дополнительное нанесение ×1,70" : null,
    ].filter(Boolean).join("; ");

    const materials = canonical.materials.map((material) => {
      if (material.category === "Основное") {
        return {
          ...material,
          name: manufacturer ? `${material.name} — ${manufacturer.name}` : material.name,
          subtitle: `Укрупнённая модель: ${canonical.totals.adjustedRate} кг/м² после коэффициентов (${appliedFactors}), затем запас ×1,10, режим точности и MIN/REC/MAX`,
        };
      }
      if (material.category === "Грунтовка") {
        return {
          ...material,
          subtitle: "Условно 0,15 л/м² ×1,15; тип грунта, впитываемость и совместимость с клеем модель не выбирает",
        };
      }
      if (material.category === "Расходники") {
        return {
          ...material,
          subtitle: `Грубая квадратная оценка ${canonical.totals.tilesPerM2} плиток/м² × 4 точки × 1,10; фактические размеры и схема швов не заданы`,
        };
      }
      return material;
    });

    const warnings = canonical.warnings.map((warning) => {
      if (warning.includes("Крупная плитка (60 см)")) {
        return "Для категории 60×60 см модель использует 7,5 кг/м². Зуб шпателя и фактический расход выбирают по наибольшей стороне плитки и техкарте конкретного клея.";
      }
      if (warning.includes("Крупноформат (>60 см)")) {
        return "Для категории 60×120 см и более модель автоматически применяет дополнительный множитель ×1,70. Способ нанесения, допустимый формат и полноту контакта проверяют по техкарте выбранного клея и проектным условиям.";
      }
      if (warning.includes("Укладка на старую плитку")) {
        return "Для старой плитки модель применяет ×1,20. Допустимость облицовки, подготовку поверхности и контактный состав определяют после проверки основания и по техкарте системы.";
      }
      return warning;
    });

    if (manufacturer) {
      warnings.unshift(
        `Выбрана линейка ${manufacturer.name}, но расчёт не загружает её паспортный расход, класс применения или фасовку: название используется только как подпись. Сверьте результат с актуальной техкартой конкретного продукта.`,
      );
    }
    warnings.push(
      "Грунтовка и крестики — предварительные позиции общей модели, а не совместимая комплектная система к покупке.",
    );

    const practicalNotes = (canonical.practicalNotes ?? []).map((note) => {
      if (note.includes("гребёнку 10-12 мм") || note.includes("гребёнка 12-15 мм")) {
        return "Размер зуба, способ нанесения и класс клея выбирайте по фактической плитке, основанию, зоне работ и техкарте продукта.";
      }
      if (note.includes("Двойное нанесение включено вручную")) {
        return "Дополнительное нанесение включено вручную: модель применила ×1,70; подтвердите способ по техкарте продукта.";
      }
      if (note.includes("Не замешивайте больше клея")) {
        return "Замешивайте объём с учётом жизнеспособности смеси из актуальной техкарты выбранного продукта.";
      }
      return note;
    });

    return {
      materials,
      totals: canonical.totals,
      warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes,
    };
  },
  formulaDescription: `
**Укрупнённая модель расхода плиточного клея:**
- профили формата: 3 / 5 / 7,5 / 7,5 кг/м²;
- место укладки: пол ×1,00, стена ×0,85, улица или тёплый пол ×1,30;
- старая плитка: ×1,20;
- дополнительное нанесение: ×1,70 (автоматически для категории 60×120 см и более либо вручную);
- затем применяются запас ×1,10, режим точности, MIN/REC/MAX и округление вверх до мешков.

Паспортный расход, зуб шпателя, толщина слоя, класс клея и фактическое основание калькулятор не определяет.
  `,
  howToUse: [
    "Введите чистую площадь облицовки без автоматического вычитания проёмов",
    "Выберите укрупнённую категорию плитки, место работ и основание",
    "Для категорий до 60×60 см при необходимости вручную включите дополнительное нанесение ×1,70",
    "Выберите фактическую фасовку мешка; линейка производителя добавляется только как подпись",
    "Сравните массу и мешки с техкартой выбранного продукта до покупки",
  ],
  faq: [
    {
      question: "От чего зависит фактический расход плиточного клея?",
      answer:
        "От конкретного продукта, зуба шпателя, наибольшей стороны и рельефа плитки, качества подготовки основания, способа нанесения и требуемой полноты контакта. Калькулятор использует укрупнённые профили и не подменяет техкарту клея.",
    },
    {
      question: "Как калькулятор учитывает запас?",
      answer:
        "После базовой нормы и фиксированных коэффициентов модель применяет ×1,10. Затем отдельно работают режим точности и сценарии MIN/REC/MAX, поэтому не добавляйте ещё один скрытый процент без причины и сверяйте итог с паспортным расходом.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Что именно считает калькулятор плиточного клея</h2>
<p>Калькулятор даёт предварительную массу сухой смеси и округляет её до мешков выбранной фасовки. Формула модели:</p>
<p><strong>M = S &times; R &times; K<sub>место</sub> &times; K<sub>основание</sub> &times; K<sub>нанесение</sub> &times; 1,10</strong></p>
<ul>
  <li><strong>S</strong> — введённая площадь облицовки;</li>
  <li><strong>R</strong> — укрупнённый профиль 3 / 5 / 7,5 / 7,5 кг/м²;</li>
  <li><strong>K<sub>место</sub></strong> — пол 1,00, стена 0,85, улица или тёплый пол 1,30;</li>
  <li><strong>K<sub>основание</sub></strong> — 1,20 только для варианта «старая плитка»;</li>
  <li><strong>K<sub>нанесение</sub></strong> — 1,70 при ручном включении или автоматически для категории 60&times;120 см и более;</li>
  <li><strong>1,10</strong> — явный запас модели до режима точности и MIN/REC/MAX.</li>
</ul>
<p>Эти числа являются коэффициентами текущей расчётной модели. Они не загружаются из паспорта выбранной линейки и не доказывают её применимость.</p>

<h2>Почему одного размера плитки недостаточно</h2>
<table>
  <thead><tr><th>Категория в форме</th><th>Базовая норма модели</th><th>Что проверить у продукта</th></tr></thead>
  <tbody>
    <tr><td>до 30&times;30 см</td><td>3 кг/м²</td><td>зуб шпателя, основание, вид плитки</td></tr>
    <tr><td>30&times;60 — 45&times;45 см</td><td>5 кг/м²</td><td>наибольшую сторону и паспортный расход</td></tr>
    <tr><td>60&times;60 см</td><td>7,5 кг/м²</td><td>допустимый формат и полноту контакта</td></tr>
    <tr><td>60&times;120 см и более</td><td>7,5 кг/м² до ×1,70</td><td>способ нанесения, класс и деформативность</td></tr>
  </tbody>
</table>
<p>Для сравнения, официальная карточка <a href="https://ceresit.ru/ru/products/tiling/tile-adhesives/cm-16" rel="noopener noreferrer" target="_blank">Ceresit CM 16</a> задаёт собственную таблицу расхода по стороне плитки и зубу шпателя, а для плит свыше 60&times;60 см описывает комбинированный способ. Именно техкарта конкретного продукта имеет приоритет над укрупнённой моделью.</p>

<h2>Основание, грунт и расходники</h2>
<p>Вариант «старая плитка» лишь применяет ×1,20. Он не подтверждает прочность старой облицовки и не выбирает контактный состав. Автоматическая грунтовка считается условно по 0,15 л/м² ×1,15, а крестики — по квадратной аппроксимации формата, четырём точкам на плитку и ×1,10. Эти позиции не являются согласованной системой материалов.</p>

<h2>Действующие документы</h2>
<p>Общие требования к облицовочным работам проверяют по действующей редакции <a href="https://protect.gost.ru/sp/details/ca915ed9-5bce-4de4-94af-debfd041a939" rel="noopener noreferrer" target="_blank">СП 71.13330.2017 с изменениями</a>. Для сухих цементных клеевых смесей действует <a href="https://protect.gost.ru/gost/details/6d1f633b-6b79-459b-9b70-727541643af7" rel="noopener noreferrer" target="_blank">ГОСТ Р 56387-2018</a>. Стандарт и СП не превращают четыре профиля калькулятора в паспорт любого товара: область применения, допустимый формат, класс, подготовку и расход берут из актуальной документации производителя.</p>
`,
    faq: [
      {
        question: "Сколько мешков клея покажет модель для 20 м²?",
        answer: "<p>Для пола, стандартного основания и фасовки 25 кг модель даёт до сценарных множителей: 66 кг для категории до 30&times;30 см, 110 кг для средней категории и 165 кг для 60&times;60 см. Для 60&times;120 см и более автоматически применяется ×1,70: 280,5 кг. Итоговые карточки MIN/REC/MAX могут отличаться, а покупка округляется вверх до целых мешков.</p><p>Это не таблица конкретного Ceresit, Knauf, Unis или другого продукта. Перед покупкой пересчитайте по паспортной норме выбранного клея.</p>",
      },
      {
        question: "Какой зуб шпателя использовать?",
        answer: "<p>Калькулятор не определяет зуб шпателя: у него нет точных размеров обеих сторон, профиля тыльной поверхности, ровности основания и техкарты продукта. Подбирайте зуб и способ нанесения по наибольшей стороне плитки и инструкции выбранного клея; паспортный расход затем используйте как контроль результата.</p>",
      },
      {
        question: "Когда наносить клей и на основание, и на плитку?",
        answer: "<p>В модели ручное или автоматическое дополнительное нанесение означает только фиксированный множитель ×1,70. Фактический комбинированный способ зависит от зоны работ, формата, основания, требуемого контакта и инструкции продукта. Например, официальная карточка Ceresit CM 16 отдельно описывает условия для наружных работ, плит от 30&times;30 см и сверхкрупного формата; универсальное правило для любого клея из одного селекта выводить нельзя.</p>",
      },
    ],
  },
};
