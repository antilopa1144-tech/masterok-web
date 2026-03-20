export const TOTAL_LABELS: Record<string, string> = {
  // Площади
  area: "Площадь", realArea: "Реальная площадь", netArea: "Чистая площадь",
  wallArea: "Площадь стен", floorArea: "Площадь пола", roofArea: "Площадь кровли",
  facadeArea: "Площадь фасада", totalArea: "Общая площадь", usefulArea: "Полезная площадь",
  totalFinishArea: "Площадь отделки", roomArea: "Площадь комнаты", heatingArea: "Площадь обогрева",
  totalSlopeArea: "Площадь откосов", areaWithWaste: "Площадь с запасом", tileArea: "Площадь плитки",
  // Объёмы
  volume: "Объём", totalVolume: "Объём с запасом", floorVolume: "Объём пола",
  wallVolume: "Объём стен", concreteM3: "Бетон",
  // Линейные
  perimeter: "Периметр", length: "Длина", height: "Высота", width: "Ширина",
  cableLength: "Длина кабеля", pipeLength: "Длина трубы",
  totalPerimeter: "Общий периметр", netLength: "Чистая длина",
  horizontalLength: "Длина марша", stringerLength: "Длина косоура",
  totalLinearM: "Погонные метры", totalHeightM: "Общая высота",
  // Толщины
  thickness: "Толщина", thicknessMm: "Толщина", wallThicknessMm: "Толщина стены",
  widthMm: "Ширина ленты", insulationThicknessMm: "Толщина утеплителя",
  // Количества
  packs: "Упаковок", rolls: "Рулонов", sheetsNeeded: "Листов", sheets: "Листов",
  tiles: "Плиток", tilesNeeded: "Плиток", totalSheets: "Листов всего",
  blocksNeeded: "Блоков", blocksNet: "Блоков (чисто)", bricksNeeded: "Кирпичей",
  totalBricks: "Кирпичей всего", bricksPerM2: "Кирпичей/м²",
  postsCount: "Столбов", panelCount: "Панелей", panelsNeeded: "Панелей",
  piecesNeeded: "Штук", bracketsCount: "Кронштейнов",
  totalCassettes: "Кассет", hangers: "Подвесов",
  boardCount: "Досок", lagCount: "Лаг", rowCount: "Рядов", railPcs: "Реек",
  stepCount: "Ступеней", doorCount: "Дверей", windowCount: "Окон",
  openingCount: "Проёмов", platesNeeded: "Плит", plateArea: "Площадь плиты",
  funnels: "Воронок", pipePcs: "Труб", gutterPcs: "Желобов",
  rollsNeeded: "Рулонов", stripsPerRoll: "Полос в рулоне", stripsNeeded: "Полос",
  fixtures: "Светильников", ppQuantity: "Профилей ПП",
  totalFoamCans: "Баллонов пены", breakersCount: "Автоматов",
  // Масса
  totalKg: "Общий вес", kgPerSqm: "Расход", cementKg: "Цемент",
  cpsTotalKg: "Общий вес смеси", ecoWoolKg: "Эковата",
  rebarTons: "Арматура", rebarWeightKg: "Арматура",
  // Объёмы жидкостей
  litersNeeded: "Нужно литров", litersWithReserve: "Литров с запасом",
  lPerSqm: "Расход", totalL: "Всего литров",
  // Мощность
  totalPowerW: "Мощность", totalPowerKW: "Мощность",
  // Кладка
  mortarVolume: "Раствор",
  // Ступени
  realStepHeight: "Высота ступени",
  // Вентиляция
  requiredAirflow: "Воздухообмен", exchangeRate: "Кратность",
  // Кровля
  slope: "Уклон",
  // Бетон / фундамент
  sourceVolume: "Объём (чистый)", concreteGrade: "Марка бетона",
  masticKg: "Мастика", filmArea: "Плёнка",
  sandM3: "Песок", gravelM3: "Щебень", waterL: "Вода",
  cementBags: "Мешков цемента", masticBuckets: "Вёдер мастики", filmRolls: "Рулонов плёнки",
  floorConcrete: "Бетон пола", wallConcrete: "Бетон стен",
  // Стяжка
  screedType: "Тип стяжки", meshArea: "Сетка армирующая",
  damperTapeM: "Демпферная лента", beaconProfiles: "Маяки",
  fiberKg: "Фиброволокно",
  // Плитка
  averageTileSizeCm: "Средний размер плитки", jointWidth: "Ширина шва",
  groutDepth: "Глубина затирки", crossesNeeded: "Крестиков/СВП",
  glueNeededKg: "Клей", groutNeededKg: "Затирка",
  // Кладка
  bricksWithReserve: "Кирпичей с запасом", mortarBags: "Мешков раствора",
  wallThickness: "Толщина стены", meshRows: "Рядов сетки", pallets: "Поддонов",
  // Газобетон / пеноблоки
  blocksWithReserve: "Блоков с запасом", glueBags: "Мешков клея",
  // Гипсокартон
  totalSheetArea: "Площадь обшивки", ppPieces: "Профилей ПП",
  pnPieces: "Профилей ПН", serpyankaRolls: "Рулонов серпянки",
  primerCans: "Канистр грунтовки",
  // Кровля
  slopeFactor: "Коэфф. уклона", ridgeLength: "Конёк",
  // Утепление
  insulationLayers: "Слоёв утеплителя",
  // Тёплый пол
  circuits: "Контуров", totalPipe: "Длина трубы",
  // Электрика
  outletsCount: "Розеток", switchesCount: "Выключателей",
  uzoCount: "Кол-во УЗО",
  // Отопление
  radiatorSections: "Секций радиаторов", totalUnits: "Радиаторов",
  // Канализация
  totalVolumeM3: "Объём септика", ringsTotal: "Колец",
  // Разное
  wastePercent: "Отходы", reserve: "Запас", cable15length: "Кабель 1.5 мм²",
  cable25length: "Кабель 2.5 мм²", layerCount: "Слоёв",
  packsNeeded: "Упаковок", packArea: "Площадь упаковки",
  doorThresholds: "Порожков", plinthPieces: "Плинтусов",
  underlaymentRolls: "Рулонов подложки", wedgesNeeded: "Клиньев",
};

export const TOTAL_UNITS: Record<string, string> = {
  // Площади
  area: "м²", realArea: "м²", netArea: "м²", wallArea: "м²", floorArea: "м²",
  roofArea: "м²", facadeArea: "м²", totalArea: "м²", usefulArea: "м²",
  totalFinishArea: "м²", roomArea: "м²", heatingArea: "м²", totalSlopeArea: "м²",
  areaWithWaste: "м²", tileArea: "м²", plateArea: "м²",
  // Объёмы
  volume: "м³", totalVolume: "м³", floorVolume: "м³", wallVolume: "м³",
  concreteM3: "м³", mortarVolume: "м³",
  // Линейные
  perimeter: "м.п.", length: "м", height: "м", width: "м",
  cableLength: "м", pipeLength: "м", totalPerimeter: "м",
  netLength: "м", horizontalLength: "м", stringerLength: "м",
  totalLinearM: "м.п.", totalHeightM: "м",
  cable15length: "м", cable25length: "м",
  // Толщины
  thickness: "мм", thicknessMm: "мм", wallThicknessMm: "мм", widthMm: "мм",
  insulationThicknessMm: "мм",
  // Масса
  totalKg: "кг", kgPerSqm: "кг/м²", cementKg: "кг", cpsTotalKg: "кг",
  ecoWoolKg: "кг", rebarTons: "т", rebarWeightKg: "кг",
  // Жидкости
  litersNeeded: "л", litersWithReserve: "л", lPerSqm: "л/м²", totalL: "л",
  // Мощность
  totalPowerW: "Вт", totalPowerKW: "кВт",
  // Ступени
  realStepHeight: "м",
  // Вентиляция
  requiredAirflow: "м³/ч", exchangeRate: "раз/ч",
  // Кровля
  slope: "°",
  // Бетон / фундамент
  sourceVolume: "м³", masticKg: "кг", filmArea: "м²",
  sandM3: "м³", gravelM3: "м³", waterL: "л",
  floorConcrete: "м³", wallConcrete: "м³",
  // Стяжка
  meshArea: "м²", damperTapeM: "м.п.", fiberKg: "кг",
  // Плитка
  averageTileSizeCm: "см", jointWidth: "мм", groutDepth: "мм",
  glueNeededKg: "кг", groutNeededKg: "кг",
  // Кладка
  wallThickness: "мм",
  // Кровля
  slopeFactor: "×", ridgeLength: "м.п.",
  // Тёплый пол
  totalPipe: "м",
  // Канализация
  totalVolumeM3: "м³",
  // Ламинат/паркет
  packArea: "м²",
  // Разное
  wastePercent: "%", reserve: "%",
};

export const HIDDEN_TOTALS = new Set([
  "grade",
  "coats",
  "sides",
  "layers",
  "inputMode",
  "puttyType",
  "qualityClass",
  // Input dimensions — already visible in the form, no need to repeat
  "length",
  "width",
  "height",
  "thickness",
  "thicknessMm",
  "wallThicknessMm",
  "widthMm",
  "insulationThicknessMm",
  // Rates/coefficients — not useful as totals
  "slopeFactor",
  "concreteGrade",
  "screedType",
  "averageTileSizeCm",
  "jointWidth",
  "groutDepth",
  "wallThickness",
  "exchangeRate",
  "bricksPerM2",
  "kgPerSqm",
  "lPerSqm",
  "slope",
  "wastePercent",
  "reserve",
]);

/**
 * Totals keys that represent countable items — should be ceil'd and pluralized.
 * Does NOT include keys like "bricksPerM2" (rate, not count).
 */
export const INTEGER_TOTAL_KEYS = new Set([
  // Sheets / panels
  "packs", "rolls", "sheetsNeeded", "sheets", "totalSheets",
  "tiles", "tilesNeeded", "panelCount", "panelsNeeded", "piecesNeeded",
  "totalCassettes", "hangers", "boardCount", "lagCount", "rowCount", "railPcs",
  "stepCount", "doorCount", "windowCount", "openingCount", "platesNeeded",
  "funnels", "pipePcs", "gutterPcs", "rollsNeeded", "stripsNeeded",
  "fixtures", "ppQuantity", "totalFoamCans", "breakersCount",
  "bracketsCount", "postsCount",
  // Blocks / bricks
  "blocksNeeded", "blocksNet", "bricksNeeded", "totalBricks", "bricksWithReserve",
  "blocksWithReserve",
  // Bags / cans / rolls
  "cementBags", "masticBuckets", "filmRolls", "glueBags",
  "mortarBags", "pallets", "meshRows",
  // Profiles
  "ppPieces", "pnPieces",
  // Misc
  "serpyankaRolls", "primerCans", "beaconProfiles",
  "crossesNeeded", "insulationLayers",
  "outletsCount", "switchesCount", "uzoCount",
  "radiatorSections", "totalUnits", "ringsTotal",
  "circuits",
  "packsNeeded", "doorThresholds", "plinthPieces",
  "underlaymentRolls", "wedgesNeeded",
  "stripsPerRoll", "layerCount",
]);

/**
 * Totals keys that represent weight in kg — show grams when < 1 kg.
 */
export const WEIGHT_KG_TOTAL_KEYS = new Set([
  "totalKg", "cementKg", "cpsTotalKg", "ecoWoolKg",
  "rebarWeightKg", "masticKg", "fiberKg",
  "glueNeededKg", "groutNeededKg",
]);

/**
 * Pluralization forms for total labels: key → [1, 2-4, 5+]
 * Only for countable items where the label should change by number.
 */
export const TOTAL_LABEL_FORMS: Record<string, [string, string, string]> = {
  // Листы
  sheetsNeeded: ["Лист", "Листа", "Листов"],
  sheets: ["Лист", "Листа", "Листов"],
  totalSheets: ["Лист всего", "Листа всего", "Листов всего"],
  // Плитки
  tiles: ["Плитка", "Плитки", "Плиток"],
  tilesNeeded: ["Плитка", "Плитки", "Плиток"],
  // Блоки / кирпичи
  blocksNeeded: ["Блок", "Блока", "Блоков"],
  blocksNet: ["Блок (чисто)", "Блока (чисто)", "Блоков (чисто)"],
  blocksWithReserve: ["Блок с запасом", "Блока с запасом", "Блоков с запасом"],
  bricksNeeded: ["Кирпич", "Кирпича", "Кирпичей"],
  totalBricks: ["Кирпич всего", "Кирпича всего", "Кирпичей всего"],
  bricksWithReserve: ["Кирпич с запасом", "Кирпича с запасом", "Кирпичей с запасом"],
  // Упаковки / мешки / рулоны / канистры
  packs: ["Упаковка", "Упаковки", "Упаковок"],
  packsNeeded: ["Упаковка", "Упаковки", "Упаковок"],
  rolls: ["Рулон", "Рулона", "Рулонов"],
  rollsNeeded: ["Рулон", "Рулона", "Рулонов"],
  underlaymentRolls: ["Рулон подложки", "Рулона подложки", "Рулонов подложки"],
  serpyankaRolls: ["Рулон серпянки", "Рулона серпянки", "Рулонов серпянки"],
  filmRolls: ["Рулон плёнки", "Рулона плёнки", "Рулонов плёнки"],
  cementBags: ["Мешок цемента", "Мешка цемента", "Мешков цемента"],
  glueBags: ["Мешок клея", "Мешка клея", "Мешков клея"],
  mortarBags: ["Мешок раствора", "Мешка раствора", "Мешков раствора"],
  masticBuckets: ["Ведро мастики", "Ведра мастики", "Вёдер мастики"],
  primerCans: ["Канистра грунтовки", "Канистры грунтовки", "Канистр грунтовки"],
  // Профили
  ppPieces: ["Профиль ПП", "Профиля ПП", "Профилей ПП"],
  pnPieces: ["Профиль ПН", "Профиля ПН", "Профилей ПН"],
  // Штуки
  panelCount: ["Панель", "Панели", "Панелей"],
  panelsNeeded: ["Панель", "Панели", "Панелей"],
  piecesNeeded: ["Штука", "Штуки", "Штук"],
  postsCount: ["Столб", "Столба", "Столбов"],
  bracketsCount: ["Кронштейн", "Кронштейна", "Кронштейнов"],
  totalCassettes: ["Кассета", "Кассеты", "Кассет"],
  hangers: ["Подвес", "Подвеса", "Подвесов"],
  boardCount: ["Доска", "Доски", "Досок"],
  lagCount: ["Лага", "Лаги", "Лаг"],
  railPcs: ["Рейка", "Рейки", "Реек"],
  stepCount: ["Ступень", "Ступени", "Ступеней"],
  doorCount: ["Дверь", "Двери", "Дверей"],
  windowCount: ["Окно", "Окна", "Окон"],
  openingCount: ["Проём", "Проёма", "Проёмов"],
  platesNeeded: ["Плита", "Плиты", "Плит"],
  funnels: ["Воронка", "Воронки", "Воронок"],
  pipePcs: ["Труба", "Трубы", "Труб"],
  gutterPcs: ["Жёлоб", "Жёлоба", "Желобов"],
  fixtures: ["Светильник", "Светильника", "Светильников"],
  totalFoamCans: ["Баллон пены", "Баллона пены", "Баллонов пены"],
  breakersCount: ["Автомат", "Автомата", "Автоматов"],
  beaconProfiles: ["Маяк", "Маяка", "Маяков"],
  pallets: ["Поддон", "Поддона", "Поддонов"],
  // Прочее
  radiatorSections: ["Секция радиатора", "Секции радиаторов", "Секций радиаторов"],
  totalUnits: ["Радиатор", "Радиатора", "Радиаторов"],
  ringsTotal: ["Кольцо", "Кольца", "Колец"],
  circuits: ["Контур", "Контура", "Контуров"],
  doorThresholds: ["Порожек", "Порожка", "Порожков"],
  plinthPieces: ["Плинтус", "Плинтуса", "Плинтусов"],
  wedgesNeeded: ["Клин", "Клина", "Клиньев"],
  crossesNeeded: ["Крестик/СВП", "Крестика/СВП", "Крестиков/СВП"],
  outletsCount: ["Розетка", "Розетки", "Розеток"],
  switchesCount: ["Выключатель", "Выключателя", "Выключателей"],
  insulationLayers: ["Слой утеплителя", "Слоя утеплителя", "Слоёв утеплителя"],
  layerCount: ["Слой", "Слоя", "Слоёв"],
  rowCount: ["Ряд", "Ряда", "Рядов"],
  meshRows: ["Ряд сетки", "Ряда сетки", "Рядов сетки"],
  stripsNeeded: ["Полоса", "Полосы", "Полос"],
  stripsPerRoll: ["Полоса в рулоне", "Полосы в рулоне", "Полос в рулоне"],
};
