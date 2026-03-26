/**
 * Calculator companion map — suggests related calculators after calculation.
 * Key: calculator slug. Value: array of companion slugs with reason text.
 */

export interface CompanionLink {
  slug: string;
  reason: string;
}

export const CALCULATOR_COMPANIONS: Record<string, CompanionLink[]> = {
  // Фундамент
  beton: [
    { slug: "armatura", reason: "Рассчитать арматуру для фундамента" },
    { slug: "lentochnyy-fundament", reason: "Ленточный фундамент — полный расчёт" },
    { slug: "otmostka", reason: "Отмостка вокруг дома" },
  ],
  "lentochnyy-fundament": [
    { slug: "beton", reason: "Сколько бетона заказать" },
    { slug: "armatura", reason: "Арматурный каркас" },
    { slug: "otmostka", reason: "Отмостка вокруг фундамента" },
  ],
  armatura: [
    { slug: "beton", reason: "Объём бетона для заливки" },
    { slug: "lentochnyy-fundament", reason: "Полный расчёт фундамента" },
  ],
  "plitnyj-fundament": [
    { slug: "beton", reason: "Объём бетона для плиты" },
    { slug: "armatura", reason: "Расчёт арматуры" },
  ],

  // Стены
  kirpich: [
    { slug: "kladka-kirpicha", reason: "Расчёт кладки и раствора" },
    { slug: "shtukaturka", reason: "Штукатурка стен после кладки" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
  ],
  gazobeton: [
    { slug: "shtukaturka", reason: "Штукатурка газоблока" },
    { slug: "gruntovka", reason: "Грунтовка газобетона" },
    { slug: "uteplenie-fasada-minvatoj", reason: "Утепление фасада" },
  ],
  gipsokarton: [
    { slug: "shpaklevka", reason: "Шпаклёвка швов ГКЛ" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска стен из ГКЛ" },
  ],
  shtukaturka: [
    { slug: "gruntovka", reason: "Грунтовка перед шпаклёвкой" },
    { slug: "shpaklevka", reason: "Шпаклёвка после штукатурки" },
  ],
  shpaklevka: [
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска стен" },
    { slug: "oboi", reason: "Или оклейка обоями" },
  ],

  // Полы
  plitka: [
    { slug: "klej-dlya-plitki", reason: "Расчёт плиточного клея" },
    { slug: "zatirka", reason: "Затирка для швов" },
    { slug: "gruntovka", reason: "Грунтовка основания" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция пола" },
  ],
  "klej-dlya-plitki": [
    { slug: "plitka", reason: "Сколько плитки купить" },
    { slug: "zatirka", reason: "Затирка для швов" },
  ],
  zatirka: [
    { slug: "plitka", reason: "Расчёт плитки" },
    { slug: "klej-dlya-plitki", reason: "Плиточный клей" },
  ],
  laminat: [
    { slug: "styazhka", reason: "Стяжка под ламинат" },
    { slug: "nalivnoy-pol", reason: "Наливной пол для выравнивания" },
  ],
  styazhka: [
    { slug: "nalivnoy-pol", reason: "Финишный наливной пол" },
    { slug: "laminat", reason: "Ламинат на стяжку" },
    { slug: "plitka", reason: "Плитка на стяжку" },
  ],

  // Отделка
  kraska: [
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "shpaklevka", reason: "Подготовка стен" },
  ],
  oboi: [
    { slug: "gruntovka", reason: "Грунтовка стен перед оклейкой" },
    { slug: "shpaklevka", reason: "Шпаклёвка неровностей" },
  ],
  gruntovka: [
    { slug: "shtukaturka", reason: "Штукатурка по грунтованной поверхности" },
    { slug: "kraska", reason: "Покраска" },
    { slug: "oboi", reason: "Оклейка обоями" },
  ],

  // Кровля
  krovlya: [
    { slug: "vodostok", reason: "Водосточная система" },
    { slug: "uteplenie-potolka", reason: "Утепление потолка/кровли" },
  ],
  vodostok: [
    { slug: "krovlya", reason: "Кровельное покрытие" },
  ],

  // Инженерные
  "teplyy-pol": [
    { slug: "styazhka", reason: "Стяжка поверх тёплого пола" },
    { slug: "plitka", reason: "Плитка на тёплый пол" },
  ],
};
