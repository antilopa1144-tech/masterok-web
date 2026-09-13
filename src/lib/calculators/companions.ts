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
    { slug: "podval-fundamenta", reason: "Бетон стен и пола подвала" },
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
    { slug: "podval-fundamenta", reason: "Арматура стен и пола подвала" },
  ],
  "plitnyj-fundament": [
    { slug: "beton", reason: "Объём бетона для плиты" },
    { slug: "armatura", reason: "Расчёт арматуры" },
    { slug: "lentochnyy-fundament", reason: "Альтернатива — ленточный" },
  ],
  "podval-fundamenta": [
    { slug: "beton", reason: "Проверить объём и состав бетона" },
    { slug: "armatura", reason: "Пересчитать арматуру по схеме" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Материалы для гидроизоляции" },
    { slug: "drenazh-uchastka", reason: "Пристенный дренаж подвала" },
    { slug: "otmostka", reason: "Отвод воды от цоколя" },
  ],

  // ── Стены и кладка ─────────────────────────────────────────────────────
  kirpich: [
    { slug: "kladka-kirpicha", reason: "Расчёт кладки и раствора" },
    { slug: "shtukaturka", reason: "Штукатурка стен после кладки" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "oblitsovochnyj-kirpich", reason: "Облицовочный кирпич для фасада" },
    { slug: "gazobeton", reason: "Газобетон вместо кирпича — сравнить блоки" },
    { slug: "penobloki", reason: "Пеноблоки и керамзитоблоки" },
  ],
  "kladka-kirpicha": [
    { slug: "kirpich", reason: "Сколько кирпича купить" },
    { slug: "shtukaturka", reason: "Штукатурка по кладке" },
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "gazobeton", reason: "Кладка из газобетонных блоков" },
    { slug: "peregorodki-iz-blokov", reason: "Перегородки из блоков" },
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
    { slug: "peregorodki-iz-blokov", reason: "Перегородки из блоков вместо ГКЛ" },
    { slug: "karkasnyj-dom", reason: "Каркасный дом — материалы по проекту" },
    { slug: "elektrika", reason: "Проводка в каркасе" },
    { slug: "zvukoizolyaciya", reason: "Звукоизоляция в каркасе" },
  ],
  shtukaturka: [
    { slug: "gruntovka", reason: "Грунтовка перед штукатуркой" },
    { slug: "shpaklevka", reason: "Шпаклёвка после штукатурки" },
    { slug: "kraska", reason: "Покраска готовой стены" },
    { slug: "gipsokarton", reason: "Альтернатива — выравнивание ГКЛ" },
    { slug: "dekorativnyj-kamen", reason: "Подготовка стены под камень" },
    { slug: "elektrika", reason: "Штробы под проводку до штукатурки" },
  ],
  shpaklevka: [
    { slug: "shtukaturka", reason: "Базовое выравнивание под шпаклёвку" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска стен" },
    { slug: "oboi", reason: "Или оклейка обоями" },
    { slug: "podvesnoy-potolok-gkl", reason: "Шпаклёвка ГКЛ-потолка" },
  ],

  "karkasnyj-dom": [
    { slug: "uteplenie", reason: "Утеплитель в каркас и перекрытия" },
    { slug: "krepezh", reason: "Гвозди, саморезы, уголки" },
    { slug: "sayding", reason: "Обшивка фасада каркасника" },
    { slug: "krovlya", reason: "Кровля по стропильной системе" },
    { slug: "gipsokarton", reason: "Внутренняя обшивка каркаса" },
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
    { slug: "parket", reason: "Паркетная доска как альтернатива" },
    { slug: "linoleum", reason: "Линолеум — другой вариант покрытия" },
  ],
  parket: [
    { slug: "styazhka", reason: "Стяжка под паркет" },
    { slug: "nalivnoy-pol", reason: "Финишное выравнивание" },
    { slug: "laminat", reason: "Ламинат — практичная альтернатива" },
  ],
  linoleum: [
    { slug: "styazhka", reason: "Стяжка под линолеум" },
    { slug: "nalivnoy-pol", reason: "Финишное выравнивание" },
    { slug: "laminat", reason: "Ламинат — другой вариант покрытия" },
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
    { slug: "dekorativnyj-kamen", reason: "Камень или фактурная штукатурка" },
  ],
  "dekorativnyj-kamen": [
    { slug: "gruntovka", reason: "Грунтовка перед укладкой" },
    { slug: "klej-dlya-plitki", reason: "Клей для камня" },
  ],
  "otkosy-okon-i-dverej": [
    { slug: "ustanovka-dverej", reason: "Материалы для монтажа дверной коробки" },
    { slug: "shtukaturka", reason: "Штукатурка откосов" },
    { slug: "gruntovka", reason: "Грунтовка под отделку" },
    { slug: "shpaklevka", reason: "Шпаклёвка перед покраской" },
    { slug: "kraska", reason: "Покраска откосов" },
    { slug: "ustanovka-okon", reason: "Монтаж оконных блоков" },
  ],
  "ustanovka-dverej": [
    { slug: "otkosy-okon-i-dverej", reason: "Отделка дверных откосов" },
    { slug: "krepezh", reason: "Дополнительный крепёж для монтажа" },
    { slug: "shpaklevka", reason: "Подготовка откосов под покраску" },
  ],
  "vannaya-komnata": [
    { slug: "plitka", reason: "Плитка для стен и пола" },
    { slug: "klej-dlya-plitki", reason: "Плиточный клей" },
    { slug: "zatirka", reason: "Затирка швов" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция санузла" },
    { slug: "teplyy-pol", reason: "Тёплый пол под плитку" },
    { slug: "dekorativnyj-kamen", reason: "Камень в отделке санузла" },
  ],
  "gidroizolyaciya-vlagozaschita": [
    { slug: "plitka", reason: "Плитка поверх гидроизоляции" },
    { slug: "styazhka", reason: "Стяжка с гидроизоляцией" },
    { slug: "vannaya-komnata", reason: "Расчёт ванной комнаты" },
    { slug: "podval-fundamenta", reason: "Гидроизоляция стен и пола подвала" },
    { slug: "ustanovka-okon", reason: "Гидроизоляция монтажного шва" },
    { slug: "dekorativnyj-kamen", reason: "Защита основания под камень" },
  ],
  krepezh: [
    { slug: "gipsokarton", reason: "Каркас под ГКЛ" },
    { slug: "paneli-dlya-sten", reason: "Монтаж стеновых панелей" },
  ],
  "paneli-dlya-sten": [
    { slug: "krepezh", reason: "Саморезы и дюбели для монтажа" },
    { slug: "gruntovka", reason: "Подготовка стены" },
    { slug: "otdelka-balkona", reason: "Обшивка балкона панелями" },
  ],

  "kalkulyator-lestnicy": [
    { slug: "beton", reason: "Бетон под площадку и крыльцо" },
    { slug: "krepezh", reason: "Крепёж для косоуров и ступеней" },
    { slug: "kraska", reason: "Покраска ступеней и ограждения" },
  ],
  "ustanovka-okon": [
    { slug: "otkosy-okon-i-dverej", reason: "Отделка откосов и отливов" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция монтажного шва" },
    { slug: "shtukaturka", reason: "Штукатурка откосов после монтажа" },
    { slug: "uteplenie-fasada-minvatoj", reason: "Утепление откосов снаружи" },
  ],
  "zvukoizolyaciya": [
    { slug: "gipsokarton", reason: "Обшивка каркаса звукоизоляции" },
    { slug: "krepezh", reason: "Профиль, подвесы, саморезы" },
    { slug: "uteplenie-potolka", reason: "Изоляция потолка от шума сверху" },
  ],
  "otdelka-balkona": [
    { slug: "uteplenie", reason: "Утепление стен и пола балкона" },
    { slug: "sayding", reason: "Обшивка балкона доской" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Защита от влаги и конденсата" },
    { slug: "paneli-dlya-sten", reason: "Панели для внутренней обшивки" },
  ],
  "otdelka-mansardy": [
    { slug: "uteplenie", reason: "Утеплитель в скатах мансарды" },
    { slug: "uteplenie-potolka", reason: "Изоляция перекрытия последнего этажа" },
    { slug: "gipsokarton", reason: "Подшивка мансарды изнутри" },
    { slug: "krovlya", reason: "Кровельное покрытие и пирог" },
  ],
  // ── Потолки ────────────────────────────────────────────────────────────
  "podvesnoy-potolok-gkl": [
    { slug: "krepezh", reason: "Подвесы и саморезы" },
    { slug: "shpaklevka", reason: "Шпаклёвка швов" },
    { slug: "gruntovka", reason: "Грунтовка перед покраской" },
    { slug: "kraska", reason: "Покраска потолка" },
    { slug: "natyazhnoj-potolok", reason: "Натяжной потолок — другой вариант" },
    { slug: "reechnyj-potolok", reason: "Реечный потолок — другой вариант" },
    { slug: "kassetnyi-potolok", reason: "Кассетный потолок для офиса" },
    { slug: "kalkulyator-lestnicy", reason: "Лестница — соседний этап" },
  ],
  "uteplenie-potolka": [
    { slug: "krovlya", reason: "Кровельное покрытие" },
    { slug: "myagkaya-krovlya", reason: "Мягкая кровля по утеплителю" },
    { slug: "uteplenie", reason: "Общий калькулятор утеплителя" },
    { slug: "podvesnoy-potolok-gkl", reason: "Подшивка потолка после утепления" },
    { slug: "otdelka-mansardy", reason: "Утепление мансарды" },
    { slug: "zvukoizolyaciya", reason: "Звукоизоляция потолка" },
  ],

  "natyazhnoj-potolok": [
    { slug: "krepezh", reason: "Профиль и крепёж для полотна" },
    { slug: "podvesnoy-potolok-gkl", reason: "ГКЛ-потолок — другой вариант" },
    { slug: "reechnyj-potolok", reason: "Реечный потолок — другой вариант" },
    { slug: "kassetnyi-potolok", reason: "Кассетный потолок — другой вариант" },
  ],
  "reechnyj-potolok": [
    { slug: "krepezh", reason: "Шины, подвесы, саморезы" },
    { slug: "natyazhnoj-potolok", reason: "Натяжной потолок — другой вариант" },
    { slug: "kassetnyi-potolok", reason: "Кассетный потолок — другой вариант" },
    { slug: "podvesnoy-potolok-gkl", reason: "ГКЛ-потолок под покраску" },
  ],
  "kassetnyi-potolok": [
    { slug: "krepezh", reason: "Подвесы и прижимы для кассет" },
    { slug: "ventilyaciya", reason: "Вентиляция в запотолочном пространстве" },
    { slug: "natyazhnoj-potolok", reason: "Натяжной потолок — другой вариант" },
    { slug: "reechnyj-potolok", reason: "Реечный потолок — другой вариант" },
  ],
  // ── Кровля ─────────────────────────────────────────────────────────────
  krovlya: [
    { slug: "vodostok", reason: "Водосточная система" },
    { slug: "uteplenie-potolka", reason: "Утепление кровельного пирога" },
    { slug: "myagkaya-krovlya", reason: "Альтернатива — мягкая кровля" },
    { slug: "otdelka-mansardy", reason: "Отделка мансарды под кровлей" },
    { slug: "karkasnyj-dom", reason: "Кровля каркасного дома" },
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
    { slug: "uteplenie", reason: "Утеплитель для каркаса под сайдингом" },
    { slug: "fasadnye-paneli", reason: "Альтернатива — фасадные панели" },
    { slug: "kalkulyator-terrasnoy-doski", reason: "Терраса из доски" },
    { slug: "otdelka-balkona", reason: "Обшивка балкона" },
  ],
  "fasadnye-paneli": [
    { slug: "uteplenie", reason: "Утеплитель для каркаса под панелями" },
    { slug: "sayding", reason: "Альтернатива — сайдинг" },
  ],
  "uteplenie-fasada-minvatoj": [
    { slug: "oblitsovochnyj-kirpich", reason: "Облицовочный кирпич" },
    { slug: "uteplenie", reason: "Общий калькулятор утеплителя" },
    { slug: "dekorativnaya-shtukaturka", reason: "Декоративная штукатурка по фасаду" },
    { slug: "otdelka-balkona", reason: "Отделка балкона с утеплением" },
    { slug: "ustanovka-okon", reason: "Утепление откосов" },
  ],

  "uteplenie": [
    { slug: "uteplenie-fasada-minvatoj", reason: "СФТК: клей, дюбели и отделка" },
    { slug: "uteplenie-potolka", reason: "Утепление перекрытия" },
    { slug: "karkasnyj-dom", reason: "Утепление каркасного дома" },
    { slug: "otdelka-mansardy", reason: "Утепление скатов мансарды" },
  ],
  "kalkulyator-terrasnoy-doski": [
    { slug: "krepezh", reason: "Кляймеры и саморезы для доски" },
    { slug: "trotuarnaya-plitka", reason: "Дорожка рядом с террасой" },
    { slug: "gazon", reason: "Газон вокруг террасы" },
    { slug: "zabor", reason: "Ограждение и перила" },
  ],
  "teplitsa-iz-polikarbonata": [
    { slug: "gazon", reason: "Грядки и газон у теплицы" },
    { slug: "trotuarnaya-plitka", reason: "Дорожка к теплице" },
    { slug: "drenazh-uchastka", reason: "Дренаж под теплицей" },
    { slug: "krepezh", reason: "Крепёж каркаса и поликарбоната" },
  ],
  // ── Инженерные ─────────────────────────────────────────────────────────
  "teplyy-pol": [
    { slug: "styazhka", reason: "Стяжка поверх тёплого пола" },
    { slug: "plitka", reason: "Плитка на тёплый пол" },
    { slug: "vodyanoy-teplyy-pol", reason: "Альтернатива — водяной контур" },
    { slug: "elektrika", reason: "Питание и терморегулятор" },
  ],
  "vodyanoy-teplyy-pol": [
    { slug: "styazhka", reason: "Стяжка над контуром" },
    { slug: "plitka", reason: "Плитка как покрытие" },
    { slug: "teplyy-pol", reason: "Альтернатива — электрический" },
    { slug: "otoplenie-radiatory", reason: "Связка с радиаторным отоплением" },
    { slug: "elektrika", reason: "Питание насоса и автоматики" },
  ],
  "otoplenie-radiatory": [
    { slug: "vodyanoy-teplyy-pol", reason: "Водяной тёплый пол как дополнение" },
    { slug: "teplyy-pol", reason: "Электрический тёплый пол" },
    { slug: "elektrika", reason: "Питание котла и насосов" },
  ],

  "elektrika": [
    { slug: "shtukaturka", reason: "Заделка штроб после проводки" },
    { slug: "gipsokarton", reason: "Проводка в каркасных стенах" },
    { slug: "krepezh", reason: "Клипсы, гофра, подрозетники" },
  ],
  "ventilyaciya": [
    { slug: "elektrika", reason: "Питание вентилятора и автоматики" },
    { slug: "krepezh", reason: "Хомуты и крепёж воздуховодов" },
    { slug: "kassetnyi-potolok", reason: "Воздуховоды за подвесным потолком" },
  ],
  // ── Благоустройство участка ────────────────────────────────────────────
  gazon: [
    { slug: "drenazh-uchastka", reason: "Дренаж против застоя воды под газоном" },
    { slug: "zabor", reason: "Забор по периметру участка" },
    { slug: "trotuarnaya-plitka", reason: "Дорожки между газонными зонами" },
    { slug: "teplitsa-iz-polikarbonata", reason: "Теплица на участке" },
  ],
  "drenazh-uchastka": [
    { slug: "gazon", reason: "Газон поверх дренируемой площадки" },
    { slug: "septik", reason: "Поля фильтрации септика" },
    { slug: "otmostka", reason: "Отмостка с отводом воды" },
    { slug: "podval-fundamenta", reason: "Защита подвала от грунтовой воды" },
    { slug: "trotuarnaya-plitka", reason: "Дорожки на сухом основании" },
    { slug: "teplitsa-iz-polikarbonata", reason: "Дренаж под теплицей" },
  ],
  septik: [
    { slug: "septik-iz-kolets", reason: "Альтернатива — септик из ЖБИ-колец" },
    { slug: "drenazh-uchastka", reason: "Дренаж и поля фильтрации" },
    { slug: "ventilyaciya", reason: "Вентиляция канализационного стояка" },
  ],
  "septik-iz-kolets": [
    { slug: "septik", reason: "Сравнить с пластиковым септиком" },
    { slug: "drenazh-uchastka", reason: "Поля фильтрации после септика" },
    { slug: "beton", reason: "Бетон для крышки и днища колодца" },
  ],
  zabor: [
    { slug: "gazon", reason: "Газон внутри участка" },
    { slug: "trotuarnaya-plitka", reason: "Дорожка вдоль забора" },
    { slug: "beton", reason: "Бетон для подбетонки столбов" },
    { slug: "krepezh", reason: "Саморезы и крепёж для профлиста" },
    { slug: "teplitsa-iz-polikarbonata", reason: "Теплица у забора" },
  ],
  "trotuarnaya-plitka": [
    { slug: "drenazh-uchastka", reason: "Дренаж под основанием дорожек" },
    { slug: "beton", reason: "Бетонное основание под плитку" },
    { slug: "gazon", reason: "Газон между дорожками" },
    { slug: "zabor", reason: "Забор по границе участка" },
    { slug: "teplitsa-iz-polikarbonata", reason: "Дорожка к теплице" },
  ],
  otmostka: [
    { slug: "beton", reason: "Бетон для отмостки" },
    { slug: "armatura", reason: "Армирование отмостки" },
    { slug: "drenazh-uchastka", reason: "Дренаж по контуру отмостки" },
    { slug: "gidroizolyaciya-vlagozaschita", reason: "Гидроизоляция стыка с цоколем" },
    { slug: "podval-fundamenta", reason: "Цокольный этаж и подвал" },
    { slug: "trotuarnaya-plitka", reason: "Отмостка из плитки" },
  ],
};
