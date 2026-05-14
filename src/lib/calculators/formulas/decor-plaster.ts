import type { CalculatorDefinition } from "../types";
import { withSiteMetaTitle } from "../meta";
import { computeCanonicalDecorPlaster } from "../../../../engine/decor-plaster";
import decorplasterSpec from "../../../../configs/calculators/decor-plaster-canonical.v1.json";
import defaultFactorTables from "../../../../configs/factor-tables.json";

export const decorPlasterDef: CalculatorDefinition = {
  id: "walls_decor_plaster",
  slug: "dekorativnaya-shtukaturka",
  title: "Калькулятор декоративной штукатурки",
  h1: "Калькулятор декоративной штукатурки онлайн — расчёт расхода",
  description: "Рассчитайте количество декоративной штукатурки (короед, шуба, камешковая, венецианская) по площади стен.",
  metaTitle: withSiteMetaTitle("Калькулятор декоративной штукатурки | Расчёт Ceresit, Baumit"),
  metaDescription: "Бесплатный калькулятор декоративной штукатурки: рассчитайте расход короеда, камешковой или венецианской штукатурки Ceresit и Baumit по площади стен.",
  category: "facade",
  categorySlug: "fasad",
  tags: ["декоративная штукатурка", "короед", "камешковая", "венецианская", "Ceresit", "Baumit"],
  popularity: 55,
  complexity: 1,
  fields: [
    {
      key: "area",
      label: "Площадь поверхности",
      type: "slider",
      unit: "м²",
      min: 1,
      max: 1000,
      step: 1,
      defaultValue: 50,
    },
    {
      key: "textureType",
      label: "Тип фактуры",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Короед (зерно 2 мм)" },
        { value: 1, label: "Короед (зерно 3 мм)" },
        { value: 2, label: "Камешковая (зерно 2.5 мм)" },
        { value: 3, label: "Шуба (роллерная)" },
        { value: 4, label: "Венецианская (тонкий слой)" },
      ],
    },
    {
      key: "surface",
      label: "Поверхность",
      type: "select",
      defaultValue: 0,
      options: [
        { value: 0, label: "Фасад (наружная)" },
        { value: 1, label: "Интерьер (внутренняя)" },
      ],
    },
    {
      key: "bagWeight",
      label: "Фасовка мешка",
      type: "select",
      defaultValue: 25,
      options: [
        { value: 15, label: "15 кг (пластиковое ведро)" },
        { value: 25, label: "25 кг (мешок)" },
      ],
    },
  ],
  calculate(inputs) {
    const spec = decorplasterSpec as any;
    const factorTable = defaultFactorTables.factors as any;
    const canonical = computeCanonicalDecorPlaster(spec, { ...inputs, accuracyMode: inputs.accuracyMode as any }, factorTable);

    return {
      materials: canonical.materials,
      totals: canonical.totals,
      warnings: canonical.warnings,
      scenarios: canonical.scenarios,
      formulaVersion: canonical.formulaVersion,
      canonicalSpecId: canonical.canonicalSpecId,
      practicalNotes: canonical.practicalNotes ?? [],
    };
  },
  formulaDescription: `
**Расход декоративной штукатурки (кг/м²):**
- Короед зерно 2 мм: 2.0–2.5 кг/м²
- Короед зерно 3 мм: 3.0–3.5 кг/м²
- Камешковая 2.5 мм: 2.8–3.2 кг/м²
- Шуба: 3.5–4.5 кг/м²
- Венецианская: 1.0–1.5 кг/м² (2 слоя)

Запас 5% на потери при нанесении.
  `,
  howToUse: [
    "Введите площадь поверхности",
    "Выберите тип фактуры",
    "Укажите — фасад или интерьер",
    "Нажмите «Рассчитать» — получите мешки и грунтовку",
  ],
  faq: [
    {
      question: "От чего зависит расход декоративной штукатурки?",
      answer:
        "От фактуры и зерна, ровности/впитываемости основания и техники нанесения. Чем крупнее зерно и хуже подготовка — тем выше расход, поэтому для точности полезен пробный участок на объекте.",
    },
    {
      question: "Нужны ли отдельные грунтовки под декоративную штукатурку?",
      answer:
        "Обычно да: грунт глубокого проникновения + подложка/кварцевый грунт под декоративный слой. Они выравнивают впитываемость, улучшают сцепление и помогают избежать пятен и «провалов» фактуры.",
    },
  ],
  seoContent: {
    descriptionHtml: `
<h2>Формула расчёта декоративной штукатурки</h2>
<p>Расход декоративной штукатурки рассчитывается по формуле:</p>
<p><strong>M = S &times; R &times; 1.05</strong></p>
<ul>
  <li><strong>M</strong> — масса штукатурки (кг)</li>
  <li><strong>S</strong> — площадь поверхности (м²)</li>
  <li><strong>R</strong> — норма расхода по типу фактуры (кг/м²)</li>
  <li><strong>1.05</strong> — запас 5% на потери при нанесении</li>
</ul>

<h2>Нормы расхода по типам фактуры</h2>
<table>
  <thead>
    <tr><th>Фактура</th><th>Зерно, мм</th><th>Расход, кг/м²</th><th>Примеры составов</th></tr>
  </thead>
  <tbody>
    <tr><td>Короед</td><td>2.0</td><td>2.0–2.5</td><td>Ceresit CT 35, Baumit GranoporTop</td></tr>
    <tr><td>Короед</td><td>3.0</td><td>3.0–3.5</td><td>Ceresit CT 35, Weber.Min</td></tr>
    <tr><td>Камешковая</td><td>2.5</td><td>2.8–3.2</td><td>Ceresit CT 137, Baumit MosaikTop</td></tr>
    <tr><td>Шуба (роллерная)</td><td>—</td><td>3.5–4.5</td><td>Ceresit CT 40, Bayramix</td></tr>
    <tr><td>Венецианская</td><td>—</td><td>1.0–1.5</td><td>VGT, Decorazza, San Marco</td></tr>
  </tbody>
</table>
<p>Фактический расход зависит от ровности основания и техники нанесения. На неровных стенах расход увеличивается на <strong>10–20%</strong>.</p>

<h2>Нормативная база</h2>
<p>Декоративные штукатурки для фасадов должны соответствовать <strong>ГОСТ 54358-2017</strong> «Составы декоративные штукатурные на цементном вяжущем». Нанесение выполняется по <strong>СП 71.13330.2017</strong> «Изоляционные и отделочные покрытия». Под фасадную штукатурку обязательно нанесение кварцевой грунтовки (Ceresit CT 16 или аналог) для улучшения адгезии и равномерности цвета.</p>

<h2>Подготовка основания</h2>
<ul>
  <li>Выравнивание стен штукатуркой или шпаклёвкой (отклонение не более 2 мм/м)</li>
  <li>Грунтовка глубокого проникновения (Ceresit CT 17)</li>
  <li>Кварцевая грунтовка (Ceresit CT 16) — обязательно для фактурных штукатурок</li>
  <li>Нанесение декоративного слоя и формирование фактуры</li>
</ul>
`,
    faq: [
      {
        question: "Сколько мешков декоративной штукатурки короед нужно на 50 м²?",
        answer: "<p>Для фасада 50 м² с фактурой <strong>короед (зерно 2 мм)</strong> и расходом 2.5 кг/м²:</p><p><strong>M = 50 &times; 2.5 &times; 1.05 = 131.3 кг</strong></p><p>Мешки 25 кг: 131.3 / 25 = <strong>6 мешков</strong>.</p><ul><li><strong>Грунтовка глубокого проникновения</strong> — 50 &times; 0.15 = 7.5 л &asymp; 1 канистра 10 л</li><li><strong>Кварцевый грунт CT 16</strong> — 50 &times; 0.3 = 15 кг &asymp; 1 ведро 15 кг</li></ul><p>Для короеда с зерном 3 мм расход возрастает до 3.0–3.5 кг/м², и потребуется уже <strong>8 мешков</strong>.</p>",
      },
      {
        question: "Можно ли наносить декоративную штукатурку на фасад зимой?",
        answer: "<p><strong>Нет</strong>, большинство декоративных штукатурок наносятся при температуре <strong>от +5 до +30°C</strong> и влажности воздуха не выше 80%. При отрицательных температурах вода в составе замерзает, и штукатурка теряет адгезию и прочность.</p><ul><li><strong>Минимальная температура основания</strong> — +5°C</li><li><strong>Запрет на нанесение</strong> — при дожде, прямом солнце, сильном ветре</li><li><strong>Зимние работы</strong> — только с тепляком (обогреваемым укрытием) и антиморозными добавками</li></ul><p>По <strong>СП 71.13330</strong> работы с мокрыми отделочными составами на фасаде при температуре ниже +5°C допускаются только при специальных мерах, которые значительно удорожают процесс.</p>",
      },
      {
        question: "Чем отличается короед от камешковой штукатурки?",
        answer: "<p>Главное различие — в способе формирования фактуры:</p><table><thead><tr><th>Параметр</th><th>Короед</th><th>Камешковая</th></tr></thead><tbody><tr><td>Фактура</td><td>Борозды (направленные канавки)</td><td>Равномерная шероховатость</td></tr><tr><td>Нанесение</td><td>Затирка кельмой в одном направлении</td><td>Прикатка валиком или затирка</td></tr><tr><td>Расход</td><td>2.0–3.5 кг/м²</td><td>2.8–3.2 кг/м²</td></tr><tr><td>Скрытие дефектов</td><td>Среднее (борозды видны)</td><td>Хорошее (однородная текстура)</td></tr></tbody></table><p>Короед популярнее на фасадах благодаря выразительному рисунку. Камешковая лучше скрывает мелкие неровности и проще в нанесении, но выглядит менее декоративно.</p>",
      },
    ],
  },
};


