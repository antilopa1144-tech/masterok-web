import type { CalcRef } from "@/lib/tools/config";
import {
  consumptionNormRow,
  type ConsumptionNormId,
} from "@/lib/tools/consumption-norms";

export interface NormRow {
  normId?: ConsumptionNormId;
  material: string;
  consumption: string;
  unit: string;
  conditions: string;
  source: string;
}

export interface NormCategory {
  title: string;
  icon: string;
  calculator?: CalcRef;
  rows: NormRow[];
}

export const CONSUMPTION_NORMS: NormCategory[] = [
  {
    title: "Грунтовка",
    icon: "💧",
    calculator: { slug: "gruntovka", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("primer-deep"),
      consumptionNormRow("primer-contact"),
      { material: "Грунтовка универсальная", consumption: "0.08–0.15", unit: "л/м²", conditions: "1 слой, подготовленное основание", source: "ГОСТ Р 55818-2013" },
    ],
  },
  {
    title: "Штукатурка",
    icon: "🧱",
    calculator: { slug: "shtukaturka", categorySlug: "steny" },
    rows: [
      consumptionNormRow("plaster-gypsum"),
      consumptionNormRow("plaster-cement"),
      consumptionNormRow("decor-plaster"),
    ],
  },
  {
    title: "Шпаклёвка",
    icon: "🪣",
    calculator: { slug: "shpaklevka", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("putty-start"),
      consumptionNormRow("putty-finish"),
      { material: "Шпаклёвка фасадная цементная", consumption: "1.5–2.5", unit: "кг/м²", conditions: "Слой 1-2 мм", source: "ГОСТ 31357-2007" },
    ],
  },
  {
    title: "Краска",
    icon: "🎨",
    calculator: { slug: "kraska", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("paint-acrylic"),
      consumptionNormRow("paint-latex"),
      consumptionNormRow("paint-facade"),
    ],
  },
  {
    title: "Плиточный клей",
    icon: "⬜",
    calculator: { slug: "klej-dlya-plitki", categorySlug: "poly" },
    rows: [
      consumptionNormRow("tile-adhesive-cm11"),
      consumptionNormRow("tile-adhesive-cm14"),
      { material: "Клей для керамогранита", consumption: "4.0–6.0", unit: "кг/м²", conditions: "Зубчатый шпатель 10-12 мм, 60×60", source: "ГОСТ 56387-2018" },
    ],
  },
  {
    title: "Затирка",
    icon: "🔲",
    calculator: { slug: "zatirka", categorySlug: "poly" },
    rows: [
      consumptionNormRow("grout"),
      { material: "Затирка цементная (шов 5мм)", consumption: "0.8–1.2", unit: "кг/м²", conditions: "Плитка 30×30, шов 5 мм", source: "Расчётная формула" },
      { material: "Затирка эпоксидная", consumption: "0.3–0.6", unit: "кг/м²", conditions: "Шов 2-3 мм", source: "Паспорт Litokol" },
    ],
  },
  {
    title: "Стяжка и наливной пол",
    icon: "🏗️",
    calculator: { slug: "styazhka", categorySlug: "poly" },
    rows: [
      { material: "Стяжка ЦПС (М150)", consumption: "20–22", unit: "кг/м² на 10мм", conditions: "Пескобетон, толщина 10 мм", source: "СП 29.13330.2011" },
      consumptionNormRow("self-leveling"),
      { material: "Наливной пол толстослойный", consumption: "1.6–2.0", unit: "кг/м² на 1мм", conditions: "Толщина 1 мм (до 100мм)", source: "Паспорт производителя" },
    ],
  },
  {
    title: "Гидроизоляция",
    icon: "🛡️",
    calculator: { slug: "gidroizolyaciya-vlagozaschita", categorySlug: "otdelka" },
    rows: [
      consumptionNormRow("waterproof"),
      { material: "Мастика битумная", consumption: "1.0–2.0", unit: "кг/м²", conditions: "1 слой, фундамент", source: "ГОСТ 30693-2000" },
      { material: "Рулонная гидроизоляция", consumption: "1.15", unit: "м²/м²", conditions: "Нахлёст 15%", source: "СП 71.13330.2017" },
    ],
  },
  {
    title: "Обойный клей",
    icon: "📜",
    calculator: { slug: "oboi", categorySlug: "otdelka" },
    rows: [
      { material: "Клей для бумажных обоев (КМЦ)", consumption: "0.15–0.20", unit: "кг/м²", conditions: "Готовый раствор, 1 слой", source: "Инструкция производителя" },
      { material: "Клей для виниловых обоев (Quelyd)", consumption: "0.20–0.25", unit: "кг/м²", conditions: "Готовый раствор, нанесение на стену", source: "Паспорт Quelyd" },
      { material: "Клей для флизелиновых обоев", consumption: "0.20–0.30", unit: "кг/м²", conditions: "Нанесение только на стену", source: "Инструкция производителя" },
      { material: "Клей для стеклообоев", consumption: "0.25–0.35", unit: "кг/м²", conditions: "Готовый раствор, густая консистенция", source: "Паспорт Oscar" },
    ],
  },
  {
    title: "Утеплители",
    icon: "🧊",
    calculator: { slug: "uteplenie", categorySlug: "fasad" },
    rows: [
      { material: "Минвата Rockwool Лайт Баттс (50 мм)", consumption: "2.0", unit: "м²/уп", conditions: "Упаковка 6 плит 600×800 мм", source: "Паспорт Rockwool" },
      { material: "Минвата Rockwool Лайт Баттс (100 мм)", consumption: "2.88", unit: "м²/уп", conditions: "Упаковка 6 плит 600×800 мм", source: "Паспорт Rockwool" },
      { material: "ЭППС Пеноплэкс Комфорт (50 мм)", consumption: "5.04", unit: "м²/уп", conditions: "Упаковка 7 листов 600×1200 мм", source: "Паспорт Пеноплэкс" },
      { material: "Пенопласт ПСБ-С 25 (50 мм)", consumption: "1.0", unit: "м²/лист", conditions: "Лист 1000×1000 мм", source: "ГОСТ 15588-2014" },
      { material: "Тарельчатый дюбель", consumption: "5–6", unit: "шт/м²", conditions: "Для крепления утеплителя к фасаду", source: "СТО 58239148-001-2006" },
    ],
  },
  {
    title: "Кладочные растворы",
    icon: "🧱",
    calculator: { slug: "kirpich", categorySlug: "steny" },
    rows: [
      { material: "Раствор М100 (кирпич 250×120×65)", consumption: "0.22–0.25", unit: "м³/м³ кладки", conditions: "Кладка в полкирпича, шов 10 мм", source: "СНиП 82-02-95" },
      { material: "Раствор М100 (кирпич утолщённый)", consumption: "0.18–0.20", unit: "м³/м³ кладки", conditions: "Кирпич 250×120×88, шов 10 мм", source: "СНиП 82-02-95" },
      consumptionNormRow("gasblock-glue"),
      { material: "Кладочная сетка 50×50", consumption: "1.0", unit: "м²/м² кладки", conditions: "Через каждые 3-5 рядов", source: "СП 15.13330.2020" },
    ],
  },
  {
    title: "Монтаж ГКЛ",
    icon: "📐",
    calculator: { slug: "gipsokarton", categorySlug: "steny" },
    rows: [
      { material: "Лист ГКЛ 2500×1200×12.5", consumption: "1.0", unit: "лист/3 м²", conditions: "Площадь листа 3 м²", source: "ГОСТ 6266-97" },
      { material: "Профиль ПС 60×27", consumption: "2.0", unit: "пог.м/м²", conditions: "Шаг стоек 600 мм", source: "Knauf технология W611" },
      { material: "Профиль ПН 28×27", consumption: "0.7–0.8", unit: "пог.м/м²", conditions: "По периметру", source: "Knauf технология" },
      { material: "Саморезы по металлу 3.5×25", consumption: "23–25", unit: "шт/лист", conditions: "Шаг крепления 250 мм", source: "Knauf технология" },
      { material: "Серпянка (лента для швов)", consumption: "1.2", unit: "пог.м/м²", conditions: "Длина стыков + запас 20%", source: "Расчётная норма" },
      { material: "Шпаклёвка для швов (Knauf Fugen)", consumption: "0.25", unit: "кг/пог.м шва", conditions: "Заделка стыка + серпянка", source: "Паспорт Knauf" },
    ],
  },
];
