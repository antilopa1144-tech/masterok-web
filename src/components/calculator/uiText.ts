import { SITE_NAME } from "@/lib/site";

export const CALCULATOR_UI_TEXT = {
  searchPlaceholder: "Найти калькулятор: бетон, плитка, ламинат...",
  searchEmpty: (query: string) => `Ничего не найдено по запросу «${query}»`,
  askMikhalych: "Спросить Михалыча →",
  examples: "Примеры:",
  parametersTitle: "Параметры расчёта",
  historyTitle: "История расчётов",
  reset: "Сбросить",
  saveToHistory: "Сохранить в историю",
  calculate: "Рассчитать",
  resultsTitle: "Результаты расчёта",
  export: "Экспорт",
  exportPdfTitle: "PDF документ",
  exportPdfDescription: "Для печати и отправки",
  exportExcelTitle: "CSV таблица",
  exportExcelDescription: "Откроется в Excel",
  expertTips: "Советы прораба",
  faqTitle: "Частые вопросы",
  allowedValues: (min: number, max: number, unit?: string) =>
    `Допустимые значения: ${min} — ${max}${unit ? ` ${unit}` : ""}`,
  defaultMaterialCategory: "Основное",
  withoutReserve: "без запаса",
  scenariosTitle: "Сколько покупать",
  scenarioLabels: {
    need: "Нужно",
    buy: "Купить",
    leftover: "Остаток",
    plan: "Упаковка",
    rounding: "Округление",
    recommended: "Рекомендуем",
    range: "Диапазон",
    from: "от",
    to: "до",
    minimum: "Минимум",
    maximum: "Максимум",
  },
  pastCalculations: "Прошлые расчёты",
  copyMaterialsHeading: `Список материалов (${SITE_NAME})`,
  materialsListTitle: "Список материалов",
  copyForMessengerTitle: "Скопировать список для мессенджера",
  copy: "Скопировать",
  copied: "Скопировано!",
  shareLinkTitle: "Поделиться ссылкой",
  share: "Поделиться",
  printTitle: "Распечатать",
  print: "Печать",
  total: "Итого",
  comparisonTitle: "Сравнение режимов",
  comparisonToggle: "Сравнить режимы",
  comparisonNote: "Показаны закупочные количества для одних и тех же входных параметров в трёх режимах точности",
  material: "Материал",
  howCalculated: "— как считали?",
  appliedModifiers: "Применённые поправки",
  scenarioFactors: "Факторы расчёта",
  totalMultiplier: "Итоговый множитель",
  hintComplexLayout: "Сложная раскладка — рекомендуем Профессиональный режим",
  hintLargeTile: "Крупный формат плитки — рекомендуем Профессиональный режим",
  hintLargeArea: "Большая площадь — Реальный режим точнее для закупки",
  hintSmallArea: "Небольшой объём — Базового режима может быть достаточно",
  customModeToggle: "Настроить коэффициенты вручную",
  feedbackTitle: "Сколько материала реально ушло?",
  feedbackPlaceholder: "Укажите фактический расход",
  feedbackUnit: "факт.",
  feedbackThanks: "Спасибо за обратную связь!",
  feedbackSubmit: "Отправить",
  accuracyModeTitle: "Точность расчёта",
  accuracyModes: {
    basic: "Базовый",
    realistic: "Реальный",
    professional: "Профессиональный",
  },
  accuracyModeDescriptions: {
    basic: "для быстрой оценки",
    realistic: "для обычного ремонта",
    professional: "для сложных условий и закупки с запасом",
  },
  copyLinkPrompt: "Скопируйте ссылку:",
  mikhalychContextBase: (calculatorTitle: string, fieldLines: string) => `Калькулятор "${calculatorTitle}". Параметры: ${fieldLines}.`,
  mikhalychContextResult: (matLines: string) => ` Результат расчёта: ${matLines}.`,
} as const;

export const MIKHALYCH_WIDGET_UI_TEXT = {
  title: "Спросите Михалыча",
  assistantName: "Михалыч",
  knowParams: "знает параметры",
  closeChat: "Закрыть чат",
  thinking: "Михалыч думает...",
  inputPlaceholder: "Задайте вопрос...",
  inputAriaLabel: "Сообщение для Михалыча",
  sendAriaLabel: "Отправить",
  askButton: "Задать вопрос →",
  apiKeyMissing: "Михалыч пока недоступен: ключ API не настроен.",
  genericApiError: "Не удалось получить ответ. Попробуйте ещё раз чуть позже.",
  networkError: "Не удалось получить ответ. Проверьте соединение и попробуйте снова.",
  greetingWithContext: (calculatorTitle: string) =>
    `Привет! Вижу, что вы работаете с **${calculatorTitle}**. Уже вижу параметры расчёта. Задавайте вопросы — отвечу с учётом ваших данных.`,
  greetingWithoutContext: (calculatorTitle: string) =>
    `Привет! Задайте вопрос по **${calculatorTitle}** — расскажу о технологии, нормах расхода и типичных ошибках.`,
  introDescription: "Опытный строительный мастер отвечает на вопросы о",
  contextVisible: "✓ Михалыч видит ваши параметры расчёта",
} as const;

export function getMikhalychAssistantErrorMessage(status?: number) {
  if (status === 401 || status === 403) {
    return "Михалыч сейчас недоступен: ошибка доступа к AI-сервису.";
  }
  if (status === 429) {
    return "Михалыч перегружен запросами. Попробуйте ещё раз чуть позже.";
  }
  if (status && status >= 500) {
    return "Сервис Михалыча временно недоступен. Попробуйте позже.";
  }
  return MIKHALYCH_WIDGET_UI_TEXT.genericApiError;
}
