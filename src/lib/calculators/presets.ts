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
};
