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
  // Разное
  wastePercent: "Отходы", reserve: "Запас", cable15length: "Кабель 1.5 мм²",
  cable25length: "Кабель 2.5 мм²", layerCount: "Слоёв",
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
