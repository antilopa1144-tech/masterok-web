export interface CuringPreset {
  id: string;
  category: string;
  name: string;
  icon: string;
  durationMinutes: number;
  description: string;
  tip: string;
}

export const CURING_PRESETS: CuringPreset[] = [
  { id: "primer-deep", category: "Грунтовка", name: "Грунтовка глубокого проникновения", icon: "💧", durationMinutes: 120, description: "2 часа при 20°C, нормальной влажности", tip: "Проверьте рукой — поверхность не должна быть липкой" },
  { id: "primer-contact", category: "Грунтовка", name: "Бетоноконтакт", icon: "💧", durationMinutes: 240, description: "4 часа. Полное высыхание — 12 часов", tip: "Бетоноконтакт должен стать сухим и шершавым на ощупь" },
  { id: "plaster-gypsum", category: "Штукатурка", name: "Штукатурка гипсовая (Ротбанд)", icon: "🧱", durationMinutes: 60, description: "Схватывание 40-60 мин. Высыхание слоя 10мм — сутки", tip: "Не сушите тепловыми пушками — будут трещины" },
  { id: "plaster-cement", category: "Штукатурка", name: "Штукатурка цементная", icon: "🧱", durationMinutes: 120, description: "Схватывание 2 часа. Набор прочности — 7 дней", tip: "Первые 3 дня увлажняйте поверхность для набора прочности" },
  { id: "putty-start", category: "Шпаклёвка", name: "Шпаклёвка стартовая", icon: "🪣", durationMinutes: 360, description: "6 часов между слоями при 20°C", tip: "Обязательна грунтовка между слоями шпаклёвки" },
  { id: "putty-finish", category: "Шпаклёвка", name: "Шпаклёвка финишная", icon: "🪣", durationMinutes: 240, description: "4 часа при слое до 2мм", tip: "Перед покраской шлифуйте при боковом свете" },
  { id: "screed-cement", category: "Стяжка", name: "Стяжка ЦПС (40-50 мм)", icon: "🏗️", durationMinutes: 1440, description: "Ходить — через сутки. Класть покрытие — через 28 дней", tip: "1 мм стяжки = 1 день высыхания. 50 мм = 50 дней" },
  { id: "self-leveling", category: "Стяжка", name: "Наливной пол", icon: "🏗️", durationMinutes: 360, description: "Ходить через 4-6 часов. Покрытие — через 7-14 дней", tip: "Не допускайте сквозняков первые сутки" },
  { id: "tile-adhesive", category: "Клей", name: "Плиточный клей", icon: "⬜", durationMinutes: 1440, description: "Схватывание 20 мин. Затирка — через сутки", tip: "Не ходите по свежей плитке! Используйте мостики" },
  { id: "wallpaper-glue", category: "Клей", name: "Обойный клей", icon: "📜", durationMinutes: 1440, description: "Полное высыхание — 24-48 часов", tip: "Не открывайте окна! Сквозняк — главный враг обоев" },
  { id: "grout", category: "Затирка", name: "Затирка для плитки", icon: "🔲", durationMinutes: 30, description: "Замывка через 15-30 мин. Полная прочность — 72 часа", tip: "Замывайте влажной губкой по диагонали к шву" },
  { id: "paint-acrylic", category: "Краска", name: "Краска акриловая", icon: "🎨", durationMinutes: 120, description: "Сухая на ощупь — 1 час. Следующий слой — 2 часа", tip: "Второй слой наносите перпендикулярно первому" },
  { id: "paint-latex", category: "Краска", name: "Краска латексная", icon: "🎨", durationMinutes: 240, description: "Сухая — 2 часа. Следующий слой — 4 часа", tip: "Не наносите толстым слоем — будут подтёки" },
  { id: "waterproof", category: "Гидроизоляция", name: "Мастика гидроизоляционная", icon: "🛡️", durationMinutes: 360, description: "Между слоями — 4-6 часов. 2 слоя обязательны!", tip: "Второй слой наносите поперёк первого" },
  { id: "custom", category: "Другое", name: "Свой таймер", icon: "⏱️", durationMinutes: 60, description: "Установите нужное время вручную", tip: "" },
];

export function isCuringPresetId(id: string): boolean {
  return CURING_PRESETS.some((p) => p.id === id);
}

export function curingTimerHref(presetId: string): string {
  return `/instrumenty/tajmer-skhvatyvaniya/?preset=${encodeURIComponent(presetId)}`;
}
