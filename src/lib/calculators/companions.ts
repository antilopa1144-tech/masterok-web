/**
 * Calculator companion map — suggests related calculators after calculation.
 * Key: calculator slug. Value: array of companion slugs with reason text.
 *
 * Связи курируются вручную по логике этапов ремонта/стройки. Цель — провести
 * пользователя по соседним расчётам в естественном порядке (грунтовка →
 * шпаклёвка → краска; плитка → клей → затирка; стяжка → тёплый пол → плитка).
 *
 * Правила добавления:
 * - 3–6 связей на калькулятор, для хабовых до 8;
 * - связи должны иметь смысл в реальной последовательности работ;
 * - целевой slug обязан существовать в meta.generated.ts (компонент сам
 *   фильтрует битые, но мусор в источнике не нужен);
 * - где логично — связи двусторонние (plitka ↔ klej-dlya-plitki ↔ zatirka).
 */

export interface CompanionLink {
  slug: string;
  reason: string;
}

export const CALCULATOR_COMPANIONS: Record<string, CompanionLink[]> = {
  // ── Фундамент ──────────────────────────────────────────────────────────
  beton: [
    { slug: "armatura", reason: "Рассчитать арматуру для фундамента" },
    { slug: "lentochnyy-fundament", reason: "Ленточный фундамент — полный расчёт" },
    { slug: "plitnyj-fundament", reason: "Плитный фундамент" },
    { slug: "otmostka", reason: "Отмостка вокруг дома" },
  ],
  "lentochnyy-fundament": [
    { slug: "beton", reason: "Сколько бетона заказать" },
    { slug: "armatura", reason: "Арматурный каркас" },
    { slug: "otmostka", reason: "Отмостка вокруг фундамента" },
    { slug: "podval-fundamenta", reason: "Цокольный этаж под лентой" },
  ],
  armatura: [
    { slug: "beton", reason: "Объём бетона для заливки" },
    { slug: "lentochnyy-fundament", reason: "Полный расчёт фундамента" },
    { slug: "plitnyj-fundament", reason: "Армирование плиты" },
  ],
  "plitnyj-fundament": [
    { slug: "beton", reason: "Объём бетона для плиты" },
    { slug: "armatura", reason: "Расчёт арматуры" },
    { slug: "lentochnyy-fundament", reason: "Альтернатива — ленточный" },
  ],

  // ── Стены и кладка ─────────────────────────────────────────────────────
  kirpich: [
    { slug: "kladka-kirpicha", reason: "Расчёт кладки и раствора" },
    { slug: "shtukaturka", reason: "Штукатурка стен после кладки" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "oblitsovochnyj-kirpich", reason: "Облицовочный кирпич для фасада" },
  ],
  "kladka-kirpicha": [
    { slug: "kirpich", reason: "Сколько кирпича купить" },
    { slug: "shtukaturka", reason: "Штукатурка по кладке" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
  ],
  "oblitsovochnyj-kirpich": [
    { slug: "kladka-kirpicha", reason: "Расчёт раствора для кладки" },
    { slug: "uteplenie-fasada-minvatoj", reason: "Утеплитель за облицовкой" },
  ],
  gazobeton: [
    { slug: "shtukaturka", reason: "Штукатурка газоблока" },
    { slug: "gruntovka", reason: "Грунтовка газобетона" },
    { slug: "uteplenie-fasada-minvatoj", reason: "Утепление фасада" },
    { slug: "shpaklevka", reason: "Шпаклёвка под отделку" },
  ],
  penobloki: [
    { slug: "shtukaturka", reason: "Штукатурка по блокам" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "uteplenie-fasada-minvatoj", reason: "Утепление фасада" },
  ],
  "peregorodki-iz-blokov": [
    { slug: "shtukaturka", reason: "Штукатурка перегородки" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "shpaklevka", reason: "Шпаклёвка под покраску" },
    { slug: "zvukoizolyaciya", reason: "Звукоизоляция перегородки" },
  ],
  gipsokarton: [
    { slug: "krepezh", reason: "Саморезы и дюбели для каркаса" },
    { slug: "shpaklevka", reason: "Шпаклёвка швов ГКЛ" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска стен из ГКЛ" },
    { slug: "shtukaturka", reason: "Альтернатива выравниванию" },
  ],
  shtukaturka: [
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "shpaklevka", reason: "Шпаклёвка после штукатурки" },
    { slug: "kraska", reason: "Покраска готовой стены" },
    { slug: "gipsokarton", reason: "Альтернатива — выравнивание ГКЛ" },
  ],
  shpaklevka: [
    { slug: "shtukaturka", reason: "Базовое выравнивание под шпаклёвку" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска стен" },
    { slug: "oboi", reason: "Или оклейка обоями" },
  ],

  // ── Полы ───────────────────────────────────────────────────────────────
  plitka: [
    { slug: "klej-dlya-plitki", reason: "Расчёт плиточного клея" },
    { slug: "zatirka", reason: "Затирка для швов" },
    { slug: "gruntovka", reason: "Грунтовка основания" },
    { slug: "styazhka", reason: "Стяжка под плитку" },
    { slug: "teplyy-pol", reason: "Тёплый пол под плитку" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция пола" },
  ],
  "klej-dlya-plitki": [
    { slug: "plitka", reason: "Сколько плитки купить" },
    { slug: "zatirka", reason: "Затирка для швов" },
    { slug: "gruntovka", reason: "Грунтовка основания" },
  ],
  zatirka: [
    { slug: "plitka", reason: "Расчёт плитки" },
    { slug: "klej-dlya-plitki", reason: "Плиточный клей" },
  ],
  laminat: [
    { slug: "styazhka", reason: "Стяжка под ламинат" },
    { slug: "nalivnoy-pol", reason: "Наливной пол для выравнивания" },
  ],
  parket: [
    { slug: "styazhka", reason: "Стяжка под паркет" },
    { slug: "nalivnoy-pol", reason: "Финишное выравнивание" },
  ],
  linoleum: [
    { slug: "styazhka", reason: "Стяжка под линолеум" },
    { slug: "nalivnoy-pol", reason: "Финишное выравнивание" },
  ],
  styazhka: [
    { slug: "nalivnoy-pol", reason: "Финишный наливной пол" },
    { slug: "laminat", reason: "Ламинат на стяжку" },
    { slug: "plitka", reason: "Плитка на стяжку" },
    { slug: "teplyy-pol", reason: "Тёплый пол в стяжке" },
  ],
  "nalivnoy-pol": [
    { slug: "styazhka", reason: "Базовая стяжка" },
    { slug: "gruntovka", reason: "Грунтовка перед заливкой" },
    { slug: "laminat", reason: "Ламинат поверх" },
    { slug: "plitka", reason: "Плитка поверх" },
  ],

  // ── Внутренняя отделка ─────────────────────────────────────────────────
  kraska: [
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "shpaklevka", reason: "Подготовка стен" },
    { slug: "shtukaturka", reason: "Базовое выравнивание" },
  ],
  oboi: [
    { slug: "gruntovka", reason: "Грунтовка стен перед оклейкой" },
    { slug: "shpaklevka", reason: "Шпаклёвка неровностей" },
    { slug: "kraska", reason: "Альтернатива — покраска" },
  ],
  gruntovka: [
    { slug: "shtukaturka", reason: "Штукатурка по грунтованной поверхности" },
    { slug: "shpaklevka", reason: "Шпаклёвка после грунтовки" },
    { slug: "kraska", reason: "Покраска" },
    { slug: "oboi", reason: "Оклейка обоями" },
    { slug: "klej-dlya-plitki", reason: "Плиточный клей по грунту" },
    { slug: "nalivnoy-pol", reason: "Наливной пол по грунтованной стяжке" },
  ],
  "dekorativnaya-shtukaturka": [
    { slug: "gruntovka", reason: "Грунтовка перед декоративкой" },
    { slug: "shpaklevka", reason: "Подготовка основания" },
    { slug: "kraska", reason: "Тонировка после нанесения" },
  ],
  "dekorativnyj-kamen": [
    { slug: "gruntovka", reason: "Грунтовка перед укладкой" },
    { slug: "klej-dlya-plitki", reason: "Клей для камня" },
  ],
  "otkosy-okon-i-dverej": [
    { slug: "shtukaturka", reason: "Штукатурка откосов" },
    { slug: "gruntovka", reason: "Грунтовка под отделку" },
    { slug: "shpaklevka", reason: "Шпаклёвка перед покраской" },
    { slug: "kraska", reason: "Покраска откосов" },
  ],
  "vannaya-komnata": [
    { slug: "plitka", reason: "Плитка для стен и пола" },
    { slug: "klej-dlya-plitki", reason: "Плиточный клей" },
    { slug: "zatirka", reason: "Затирка швов" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция санузла" },
    { slug: "teplyy-pol", reason: "Тёплый пол под плитку" },
  ],
  "gidroizolyaciya-vlagozaschita": [
    { slug: "plitka", reason: "Плитка поверх гидроизоляции" },
    { slug: "styazhka", reason: "Стяжка с гидроизоляцией" },
    { slug: "vannaya-komnata", reason: "Расчёт ванной комнаты" },
  ],
  krepezh: [
    { slug: "gipsokarton", reason: "Каркас под ГКЛ" },
    { slug: "paneli-dlya-sten", reason: "Монтаж стеновых панелей" },
  ],
  "paneli-dlya-sten": [
    { slug: "krepezh", reason: "Саморезы и дюбели для монтажа" },
    { slug: "gruntovka", reason: "Подготовка стены" },
  ],

  // ── Потолки ────────────────────────────────────────────────────────────
  "gipsokarton-potolok": [
    { slug: "krepezh", reason: "Саморезы и подвесы для каркаса" },
    { slug: "shpaklevka", reason: "Шпаклёвка швов" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска потолка" },
  ],
  "podvesnoy-potolok-gkl": [
    { slug: "krepezh", reason: "Подвесы и саморезы" },
    { slug: "shpaklevka", reason: "Шпаклёвка швов" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска потолка" },
  ],
  "uteplenie-potolka": [
    { slug: "krovlya", reason: "Кровельное покрытие" },
    { slug: "myagkaya-krovlya", reason: "Мягкая кровля по утеплителю" },
  ],

  // ── Кровля ─────────────────────────────────────────────────────────────
  krovlya: [
    { slug: "vodostok", reason: "Водосточная система" },
    { slug: "uteplenie-potolka", reason: "Утепление кровельного пирога" },
    { slug: "myagkaya-krovlya", reason: "Альтернатива — мягкая кровля" },
  ],
  "myagkaya-krovlya": [
    { slug: "krovlya", reason: "Сравнение с жёсткой кровлей" },
    { slug: "vodostok", reason: "Водосточная система" },
    { slug: "uteplenie-potolka", reason: "Утепление под мягкой кровлей" },
  ],
  vodostok: [
    { slug: "krovlya", reason: "Кровельное покрытие" },
    { slug: "myagkaya-krovlya", reason: "Мягкая кровля" },
  ],

  // ── Фасад ──────────────────────────────────────────────────────────────
  sayding: [
    { slug: "uteplenie-fasada-minvatoj", reason: "Утеплитель под сайдингом" },
    { slug: "fasadnye-paneli", reason: "Альтернатива — фасадные панели" },
  ],
  "fasadnye-paneli": [
    { slug: "uteplenie-fasada-minvatoj", reason: "Утеплитель под панелями" },
    { slug: "sayding", reason: "Альтернатива — сайдинг" },
  ],
  "uteplenie-fasada-minvatoj": [
    { slug: "sayding", reason: "Сайдинг поверх утеплителя" },
    { slug: "fasadnye-paneli", reason: "Фасадные панели поверх" },
    { slug: "oblitsovochnyj-kirpich", reason: "Облицовочный кирпич" },
  ],

  // ── Инженерные ─────────────────────────────────────────────────────────
  "teplyy-pol": [
    { slug: "styazhka", reason: "Стяжка поверх тёплого пола" },
    { slug: "plitka", reason: "Плитка на тёплый пол" },
    { slug: "vodyanoy-teplyy-pol", reason: "Альтернатива — водяной контур" },
  ],
  "vodyanoy-teplyy-pol": [
    { slug: "styazhka", reason: "Стяжка над контуром" },
    { slug: "plitka", reason: "Плитка как покрытие" },
    { slug: "teplyy-pol", reason: "Альтернатива — электрический" },
    { slug: "otoplenie-radiatory", reason: "Связка с радиаторным отоплением" },
  ],
  "otoplenie-radiatory": [
    { slug: "vodyanoy-teplyy-pol", reason: "Водяной тёплый пол как дополнение" },
    { slug: "teplyy-pol", reason: "Электрический тёплый пол" },
  ],
};
