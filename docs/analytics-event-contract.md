# Контракт продуктовой аналитики «Мастерка»

## Назначение и источник истины

Документ определяет, какие события разрешено отправлять, что они означают и как
из них строятся метрики. Закрытый список событий и типы параметров находятся в
`src/lib/analytics/events.ts`; тест не позволяет коду и этому документу
расходиться.

Владелец контракта — продукт «Мастерок». Инженерный владелец доставки — общий
адаптер `src/lib/analytics.ts`, одновременно отправляющий события в GA4 и
Яндекс Метрику только на production-домене.

## Непереговорные правила данных

- Не отправлять имя, телефон, email, адрес, название проекта и свободный текст.
- Не отправлять исходные значения строительной формы или итоговые количества.
- Не отправлять полный URL, query string, hash или несокращённый referrer.
- Поисковый запрос остаётся в браузере. Разрешены только длина и число слов.
- Идентификаторы калькулятора, инструмента, поля, режима, пресета и placement
  должны быть значениями из кода, а не пользовательским вводом.
- Новое событие сначала добавляется в типизированный каталог, документацию и
  тесты, и только потом — в UI.

## Каталог событий

| Событие | Роль | Триггер | Параметры | Дедупликация |
|---|---|---|---|---|
| `calculator_start` | Primary | Первое осмысленное действие в форме | `calculator` | Один раз за mount |
| `calculator_result_view` | Primary | Результат виден после старта | `calculator` | Один раз за mount |
| `calculator_validation_error` | Guardrail | Явный расчёт с ошибками | `calculator`, `invalid_field_count`, `first_invalid_field` | Один раз для неизменившегося набора полей |
| `calculator_calculate` | Driver | Успешное явное нажатие «Рассчитать» | `calculator`, `accuracy_mode` | Каждое успешное нажатие |
| `calculator_export` | Driver | Выбран формат экспорта | `calculator`, `format` | Каждое действие |
| `calculator_share` | Driver | Ссылка скопирована или передана | `calculator`, `method` | Только успешные действия |
| `project_create` | Driver | Проект успешно создан | `source` | Только успешные создания |
| `project_open` | Primary | Смета открыта из каталога проектов | `source`, `entry_count_bucket` | Каждый явный переход |
| `project_export` | Driver | Запрошена печать/CSV или успешно скопирована смета | `format` | Каждое явное действие |
| `project_related_click` | Driver | Переход из проекта в известный калькулятор или инструмент | `target` | Каждый переход |
| `project_save_calculation` | Driver | Запись сохранена в проект | `calculator`, `created_project` | Только успешные сохранения |
| `calculator_related_click` | Driver | Переход к связанной раскладке | `calculator`, `target` | Каждый переход |
| `accuracy_mode_change` | Diagnostic | Изменён режим точности | `calculator`, `from`, `to` | Каждое изменение |
| `accuracy_comparison_open` | Diagnostic | Открыто сравнение режимов | `calculator` | Каждое открытие |
| `tool_start` | Primary | Первое осмысленное действие | `tool`, `source` | Один раз за mount |
| `tool_result_view` | Primary | Схема видна после старта | `tool` | Один раз за mount |
| `tool_mode_change` | Diagnostic | Изменён режим раскладки | `tool`, `mode` | Каждое изменение |
| `tool_preset_select` | Diagnostic | Выбран встроенный пресет | `tool`, `preset_group`, `preset` | Каждый выбор |
| `tool_export` | Driver | Запрошен экспорт или копирование схемы | `tool`, `format` | Каждый явный запрос |
| `tool_related_click` | Driver | Переход к связанному калькулятору | `tool`, `target` | Каждый переход |
| `site_search_select` | Driver | Выбран результат поиска | `query_length`, `query_word_count`, `result_type`, `result_id` | Каждый выбор |
| `site_search_empty` | Guardrail | Запрос от трёх символов без результатов | `query_length`, `query_word_count` | Один раз на нормализованный запрос за mount |
| `rustore_click` | Driver | Переход в RuStore | `placement` | Каждый переход |

Все строки таблицы имеют `owner=product` и `pii=none` в машинном каталоге.

## Системные измерения

`page_view` не является продуктовым событием. Он отправляется отдельно при смене
pathname. `page_location`, `page_path` и `page_referrer` не содержат query/hash.
Изменение только поисковых или калькуляторных query-параметров не создаёт новый
pageview.

Web Vitals передаются в Метрику как параметры визита `web_vital_*` и не входят в
воронку действий.

## KPI Phase 0

### Основные

1. **Calculator result-view rate** — сессии с последовательностью
   `calculator_start → calculator_result_view` для одного `calculator` /
   сессии с `calculator_start`.
2. **Tool result-view rate** — сессии с `tool_start → tool_result_view` для одного
   `tool` / сессии с `tool_start`.
3. **Downstream action rate** — сессии с export/share/save/related после результата
   / сессии с соответствующим `*_result_view`.

### Диагностика и guardrails

- Validation friction — сессии с `calculator_validation_error` / сессии с
  `calculator_start`.
- Observed search no-result share — `site_search_empty` /
  (`site_search_empty` + `site_search_select`). Это не полная search success rate:
  отказ от выбора пока не измеряется.
- Режимы, пресеты и источники старта используются только для объяснения воронки,
  но не являются самостоятельными целями роста.
- `calculator_export` и `tool_export` фиксируют запрос пользователя, а не
  техническое подтверждение готового файла; их нельзя называть export success.

Фиксированные численные цели задаются после 14 полных дней чистого production-
baseline. До этого ворота качества инструментации: ноль raw PII, ноль событий с
неизвестным именем, обязательные параметры заполнены, `start` и `result_view` не
дублируются в пределах одного mount.

## Настройка систем и период проверки

- В GA4 зарегистрировать event-scoped custom dimensions: `calculator`, `tool`,
  `source`, `format`, `target`, `entry_count_bucket`, `result_type`, `result_id`,
  `first_invalid_field`.
- В Метрике создать цели для primary и downstream событий; диагностические
  события не объявлять конверсиями без отдельного решения.
- Сравнивать равные полные окна, отдельно по mobile/desktop и шаблону страницы.
- Первые часы после релиза используются только для проверки доставки. Baseline
  начинается со следующего полного дня и длится минимум 14 дней.
