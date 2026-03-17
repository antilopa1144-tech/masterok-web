/**
 * Пресеты (быстрые примеры) для калькуляторов.
 * Ключ — slug калькулятора, значение — массив примеров.
 */

export interface CalcPreset {
  label: string;
  values: Record<string, number>;
}

export const CALCULATOR_PRESETS: Record<string, CalcPreset[]> = {
  // ── Фундамент ──────────────────────────────────
  beton: [
    { label: "Стяжка пола 30м²", values: { length: 6, width: 5, height: 0.05, concreteGrade: 0 } },
    { label: "Фундамент гаража", values: { length: 6, width: 4, height: 0.3, concreteGrade: 1 } },
    { label: "Фундамент дома", values: { length: 10, width: 8, height: 0.4, concreteGrade: 2 } },
  ],
  "lentochnyy-fundament": [
    { label: "Дом 8×10", values: { outerLength: 10, outerWidth: 8, depth: 1.2, widthMm: 400, innerWalls: 1, innerWallLength: 8 } },
    { label: "Баня 4×6", values: { outerLength: 6, outerWidth: 4, depth: 0.8, widthMm: 300, innerWalls: 0, innerWallLength: 0 } },
  ],

  // ── Стены ──────────────────────────────────────
  kirpich: [
    { label: "Перегородка 3×2.7", values: { inputMode: 0, length: 3, width: 2.7, brickType: 0, layingType: 0, mortarThickness: 10 } },
    { label: "Стена дома 10×3", values: { inputMode: 0, length: 10, width: 3, brickType: 0, layingType: 1, mortarThickness: 10 } },
  ],
  gipsokarton: [
    { label: "Комната 15м²", values: { inputMode: 1, area: 15, height: 2.7, layers: 1, hasInsulation: 0 } },
    { label: "Потолок 20м²", values: { inputMode: 1, area: 20, height: 2.7, layers: 1, hasInsulation: 1 } },
  ],

  // ── Полы ───────────────────────────────────────
  plitka: [
    { label: "Ванная 6м²", values: { inputMode: 1, area: 6, tileWidth: 300, tileHeight: 300, jointWidth: 2 } },
    { label: "Кухня 10м²", values: { inputMode: 1, area: 10, tileWidth: 600, tileHeight: 600, jointWidth: 2 } },
    { label: "Коридор 4×1.5", values: { inputMode: 0, length: 4, width: 1.5, tileWidth: 300, tileHeight: 600, jointWidth: 2 } },
  ],
  laminat: [
    { label: "Спальня 12м²", values: { inputMode: 1, area: 12, packArea: 2.4, layingMethod: 0, hasUnderlayment: 1 } },
    { label: "Гостиная 20м²", values: { inputMode: 1, area: 20, packArea: 2.4, layingMethod: 0, hasUnderlayment: 1 } },
    { label: "Квартира 45м²", values: { inputMode: 1, area: 45, packArea: 2.4, layingMethod: 0, hasUnderlayment: 1 } },
  ],
  styazhka: [
    { label: "Комната 15м²", values: { inputMode: 1, area: 15, thickness: 50, mixtureType: 0 } },
    { label: "Квартира 60м²", values: { inputMode: 1, area: 60, thickness: 40, mixtureType: 0 } },
  ],
  linoleum: [
    { label: "Кухня 3×4", values: { length: 4, width: 3, rollWidth: 3, hasPattern: 0 } },
    { label: "Зал 5×4", values: { length: 5, width: 4, rollWidth: 4, hasPattern: 0 } },
  ],

  // ── Кровля ─────────────────────────────────────
  krovlya: [
    { label: "Гараж 6×4", values: { length: 6, width: 4, slope: 25, materialType: 0 } },
    { label: "Дом 10×8", values: { length: 10, width: 8, slope: 30, materialType: 0 } },
  ],

  // ── Отделка ────────────────────────────────────
  oboi: [
    { label: "Спальня 12м²", values: { length: 4, width: 3, height: 2.6, rollWidth: 530, rollLength: 10, hasPattern: 0 } },
    { label: "Гостиная 20м²", values: { length: 5, width: 4, height: 2.7, rollWidth: 530, rollLength: 10, hasPattern: 1 } },
  ],
  kraska: [
    { label: "Стены комнаты 15м²", values: { inputMode: 1, area: 40, coats: 2, paintType: 0 } },
    { label: "Потолок 20м²", values: { inputMode: 1, area: 20, coats: 2, paintType: 0 } },
  ],
  shtukaturka: [
    { label: "Стена 3×2.7", values: { inputMode: 0, length: 3, width: 2.7, thickness: 15, plasterType: 0 } },
    { label: "Комната 15м²", values: { inputMode: 1, area: 40, thickness: 10, plasterType: 0 } },
  ],

  // ── Инженерные ─────────────────────────────────
  elektrika: [
    { label: "1-комн. квартира", values: { apartmentArea: 35, roomsCount: 1, ceilingHeight: 2.7, hasKitchen: 1 } },
    { label: "2-комн. квартира", values: { apartmentArea: 55, roomsCount: 2, ceilingHeight: 2.7, hasKitchen: 1 } },
    { label: "3-комн. квартира", values: { apartmentArea: 80, roomsCount: 3, ceilingHeight: 2.7, hasKitchen: 1 } },
  ],
  "otoplenie-radiatory": [
    { label: "Квартира 60м²", values: { totalArea: 60, ceilingHeight: 270, climateZone: 1, buildingType: 1, radiatorType: 0, roomCount: 3 } },
    { label: "Дом 120м²", values: { totalArea: 120, ceilingHeight: 270, climateZone: 1, buildingType: 2, radiatorType: 0, roomCount: 6 } },
  ],

  // ── Новые калькуляторы ───────────────────────────
  krepezh: [
    { label: "ГКЛ 10 листов", values: { materialType: 0, sheetCount: 10, fastenerStep: 250, withFrameScrews: 1, withDubels: 0 } },
    { label: "ОСБ 20 листов", values: { materialType: 1, sheetCount: 20, fastenerStep: 200, withFrameScrews: 1, withDubels: 1 } },
    { label: "Профлист 50 м²", values: { materialType: 2, sheetCount: 50, fastenerStep: 300, withFrameScrews: 0, withDubels: 0 } },
  ],
  penobloki: [
    { label: "Дом 10×2.7 м", values: { inputMode: 0, wallLength: 10, wallHeight: 2.7, openingsArea: 5, blockSize: 0, mortarType: 0 } },
    { label: "Перегородка 5×2.7", values: { inputMode: 0, wallLength: 5, wallHeight: 2.7, openingsArea: 1, blockSize: 1, mortarType: 0 } },
    { label: "Керамзитоблок 30 м²", values: { inputMode: 1, area: 30, openingsArea: 3, blockSize: 2, mortarType: 1 } },
  ],
  "kladka-kirpicha": [
    { label: "Стена дома 10×2.7", values: { inputMode: 0, wallLength: 10, wallHeight: 2.7, openingsArea: 5, brickFormat: 0, wallThickness: 1, mortarJoint: 10 } },
    { label: "В 1.5 кирпича 8×3", values: { inputMode: 0, wallLength: 8, wallHeight: 3, openingsArea: 4, brickFormat: 0, wallThickness: 2, mortarJoint: 10 } },
    { label: "Перегородка 15 м²", values: { inputMode: 1, area: 15, openingsArea: 2, brickFormat: 1, wallThickness: 0, mortarJoint: 10 } },
  ],
  armatura: [
    { label: "Плита 10×8 м", values: { structureType: 0, length: 10, width: 8, height: 0.3, mainDiameter: 12, gridStep: 200 } },
    { label: "Лента 10×8 м", values: { structureType: 1, length: 10, width: 8, height: 0.8, mainDiameter: 12, gridStep: 200 } },
    { label: "Армопояс 30 м.п.", values: { structureType: 2, length: 15, width: 15, height: 0.25, mainDiameter: 10, gridStep: 200 } },
  ],
  "vannaya-komnata": [
    { label: "Типовая 2.5×1.7", values: { length: 2.5, width: 1.7, height: 2.5, floorTileSize: 0, wallTileSize: 1, hasWaterproofing: 1, doorWidth: 0.7 } },
    { label: "Большая 3×2.5", values: { length: 3, width: 2.5, height: 2.5, floorTileSize: 2, wallTileSize: 2, hasWaterproofing: 1, doorWidth: 0.8 } },
  ],
  "podvesnoy-potolok-gkl": [
    { label: "Комната 5×4", values: { inputMode: 0, length: 5, width: 4, layers: 1, profileStep: 600 } },
    { label: "Зал 6×5", values: { inputMode: 0, length: 6, width: 5, layers: 1, profileStep: 600 } },
    { label: "Двойной слой 20 м²", values: { inputMode: 1, area: 20, layers: 2, profileStep: 600 } },
  ],
  "vodyanoy-teplyy-pol": [
    { label: "Комната 5×4, шаг 200", values: { inputMode: 0, length: 5, width: 4, pipeStep: 200, pipeType: 0 } },
    { label: "Дом 60 м², шаг 150", values: { inputMode: 1, area: 60, pipeStep: 150, pipeType: 0 } },
  ],
  septik: [
    { label: "Семья 4 чел., кольца", values: { residents: 4, septikType: 0, chambersCount: 2, pipeLength: 10, groundType: 0 } },
    { label: "Дом 6 чел., пластик", values: { residents: 6, septikType: 1, chambersCount: 2, pipeLength: 15, groundType: 1 } },
  ],
  "karkasnyj-dom": [
    { label: "Дом 6×8 (периметр 28 м)", values: { wallLength: 28, wallHeight: 2.7, openingsArea: 10, studStep: 600, insulationType: 0, outerSheathing: 0, innerSheathing: 0 } },
    { label: "Дом 8×10 (периметр 36 м)", values: { wallLength: 36, wallHeight: 2.7, openingsArea: 15, studStep: 600, insulationType: 1, outerSheathing: 1, innerSheathing: 1 } },
  ],
  "myagkaya-krovlya": [
    { label: "Дом 80 м²", values: { roofArea: 80, slope: 30, ridgeLength: 8, eaveLength: 20, valleyLength: 0 } },
    { label: "Дом 150 м² с ендовами", values: { roofArea: 150, slope: 25, ridgeLength: 12, eaveLength: 30, valleyLength: 8 } },
  ],
};
