export type AnalyticsKpiRole = "primary" | "driver" | "guardrail" | "diagnostic";
export type SearchResultType = "calculator" | "blog" | "checklist" | "tool";
export type ToolInteractionSource =
  | "surface_size"
  | "material_size"
  | "layout_mode"
  | "joint_width"
  | "material_reserve"
  | "material_packaging"
  | "opening"
  | "preset"
  | "search"
  | "category";
export type ProjectCreateSource = "empty" | "list";
export type ProjectEntryCountBucket = "0" | "1-3" | "4+";
export type ProjectExportFormat = "csv" | "print" | "clipboard";
export type ToolCatalogPlacement =
  | "tool_grid"
  | "checklist_all"
  | "checklist_preview"
  | "checklist_grid";
export type ChecklistProgressMilestone = 25 | 50 | 75 | 100;
export type ChecklistExportFormat = "pdf" | "print";

export interface AnalyticsEventParams {
  accuracy_comparison_open: { calculator: string };
  accuracy_mode_change: { calculator: string; from: string; to: string };
  calculator_calculate: { calculator: string; accuracy_mode: string };
  calculator_export: { calculator: string; format: "pdf" | "excel" };
  calculator_related_click: { calculator: string; target: string };
  calculator_result_view: { calculator: string };
  calculator_share: { calculator: string; method: "native" | "clipboard" };
  calculator_start: { calculator: string };
  calculator_validation_error: {
    calculator: string;
    invalid_field_count: number;
    first_invalid_field: string;
  };
  checklist_export: { checklist: string; format: ChecklistExportFormat };
  checklist_progress: { checklist: string; milestone: ChecklistProgressMilestone };
  checklist_start: { checklist: string };
  project_create: { source: ProjectCreateSource };
  project_export: { format: ProjectExportFormat };
  project_open: {
    source: "catalog";
    entry_count_bucket: ProjectEntryCountBucket;
  };
  project_related_click: { target: string };
  project_save_calculation: { calculator: string; created_project: boolean };
  rustore_click: { placement: string };
  site_search_empty: SearchQueryMetrics;
  site_search_select: SearchQueryMetrics & {
    result_type: SearchResultType;
    result_id: string;
  };
  tool_export: { tool: string; format: "png" | "pdf" | "share" };
  tool_catalog_select: { target: string; placement: ToolCatalogPlacement };
  tool_mode_change: { tool: string; mode: string };
  tool_preset_select: {
    tool: string;
    preset_group: "surface" | "material";
    preset: string;
  };
  tool_related_click: { tool: string; target: string };
  tool_result_view: { tool: string };
  tool_start: { tool: string; source: ToolInteractionSource };
}

export type AnalyticsEventName = keyof AnalyticsEventParams;

export interface AnalyticsEventDefinition {
  owner: "product";
  kpiRole: AnalyticsKpiRole;
  pii: "none";
  trigger: string;
  dedupe: string;
}

export const ANALYTICS_EVENT_DEFINITIONS = {
  accuracy_comparison_open: {
    owner: "product", kpiRole: "diagnostic", pii: "none",
    trigger: "Пользователь открывает сравнение режимов точности.",
    dedupe: "Каждое явное открытие панели.",
  },
  accuracy_mode_change: {
    owner: "product", kpiRole: "diagnostic", pii: "none",
    trigger: "Пользователь выбирает другой режим точности.",
    dedupe: "Каждое фактическое изменение режима.",
  },
  calculator_calculate: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Успешный явный расчёт после нажатия кнопки.",
    dedupe: "Каждое успешное явное нажатие.",
  },
  calculator_export: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь выбирает формат экспорта результата.",
    dedupe: "Каждый выбранный формат экспорта.",
  },
  calculator_related_click: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Переход из калькулятора в связанный инструмент.",
    dedupe: "Каждый явный переход по ссылке.",
  },
  calculator_result_view: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Результат виден после осмысленного действия пользователя.",
    dedupe: "Один раз за монтирование калькулятора.",
  },
  calculator_share: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Ссылка успешно передана или скопирована.",
    dedupe: "Каждое успешное действие пользователя.",
  },
  calculator_start: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Первое осмысленное действие в форме калькулятора.",
    dedupe: "Один раз за монтирование калькулятора.",
  },
  calculator_validation_error: {
    owner: "product", kpiRole: "guardrail", pii: "none",
    trigger: "Явная попытка расчёта с невалидными полями.",
    dedupe: "Один раз для неизменившегося набора ошибочных полей.",
  },
  checklist_export: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь запрашивает печать или успешно сохраняет PDF чек-листа.",
    dedupe: "Каждое явное действие экспорта.",
  },
  checklist_progress: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Прогресс чек-листа впервые пересекает контрольную отметку.",
    dedupe: "Каждая отметка 25, 50, 75 или 100 процентов один раз за mount.",
  },
  checklist_start: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Первое изменение пункта чек-листа пользователем.",
    dedupe: "Один раз за mount чек-листа.",
  },
  project_create: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Проект успешно создан из пустого состояния или списка.",
    dedupe: "Каждое успешное создание проекта.",
  },
  project_export: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь запрашивает печать, CSV или успешно копирует смету.",
    dedupe: "Каждое явное действие экспорта.",
  },
  project_open: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Пользователь явно открывает смету из каталога проектов.",
    dedupe: "Каждый явный переход в смету.",
  },
  project_related_click: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Переход из проекта в известный калькулятор или инструмент.",
    dedupe: "Каждый явный переход по ссылке.",
  },
  project_save_calculation: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Расчёт успешно сохранён в проект.",
    dedupe: "Каждое успешное сохранение.",
  },
  rustore_click: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Переход к приложению из известного placement.",
    dedupe: "Каждый явный переход по ссылке.",
  },
  site_search_empty: {
    owner: "product", kpiRole: "guardrail", pii: "none",
    trigger: "Поиск длиной от трёх символов не дал результатов.",
    dedupe: "Один раз для нормализованного запроса за монтирование.",
  },
  site_search_select: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь выбирает результат внутреннего поиска.",
    dedupe: "Каждый явный выбор результата.",
  },
  tool_export: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь запрашивает экспорт или копирование схемы.",
    dedupe: "Каждый явный запрос экспорта.",
  },
  tool_catalog_select: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Пользователь выбирает известную карточку в каталоге инструментов.",
    dedupe: "Каждый явный переход по карточке или ссылке.",
  },
  tool_mode_change: {
    owner: "product", kpiRole: "diagnostic", pii: "none",
    trigger: "Пользователь меняет режим визуального инструмента.",
    dedupe: "Каждое фактическое изменение режима.",
  },
  tool_preset_select: {
    owner: "product", kpiRole: "diagnostic", pii: "none",
    trigger: "Пользователь выбирает предопределённый пресет.",
    dedupe: "Каждый явный выбор пресета.",
  },
  tool_related_click: {
    owner: "product", kpiRole: "driver", pii: "none",
    trigger: "Переход из инструмента в связанный калькулятор.",
    dedupe: "Каждый явный переход по ссылке.",
  },
  tool_result_view: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Результат инструмента виден после осмысленного действия.",
    dedupe: "Один раз за монтирование инструмента.",
  },
  tool_start: {
    owner: "product", kpiRole: "primary", pii: "none",
    trigger: "Первое осмысленное действие в визуальном инструменте.",
    dedupe: "Один раз за монтирование инструмента.",
  },
} as const satisfies Record<AnalyticsEventName, AnalyticsEventDefinition>;

export interface SearchQueryMetrics {
  query_length: number;
  query_word_count: number;
}

/** Возвращает только агрегаты запроса: сам текст никогда не покидает браузер. */
export function getSearchQueryMetrics(query: string): SearchQueryMetrics {
  const normalized = query.trim().replace(/\s+/g, " ");
  return {
    query_length: Array.from(normalized).length,
    query_word_count: normalized ? normalized.split(" ").length : 0,
  };
}
