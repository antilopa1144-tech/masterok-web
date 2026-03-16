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
]);
