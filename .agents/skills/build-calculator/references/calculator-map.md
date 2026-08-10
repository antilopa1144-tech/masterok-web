# Карта жизненного цикла калькулятора

## Основные точки

| Задача | Источник |
|---|---|
| Формулы, коэффициенты, упаковки, единицы | `engine/` |
| Поля, подсказки, meta, FAQ | `src/lib/calculators/formulas/` |
| Registry и категории | `src/lib/calculators/` |
| Состояние формы и история | `src/components/calculator/useCalculator.ts` |
| Отображение формы и результата | `src/components/calculator/CalculatorParts.tsx` |
| Страница калькулятора | `src/app/kalkulyatory/[category]/[slug]/` |
| Unit-тесты | `src/lib/calculators/__tests__/`, `tests/` |
| Web/mobile parity | `tests/fixtures/parity/`, `tests/parity.test.ts` |
| Генерация Dart | `scripts/sync-specs-to-dart.ts` |

## Матрица изменений

| Изменение | Обязательные действия |
|---|---|
| Только текст или подсказка | Точечный тест при наличии, lint, проверка UI |
| Поле или дефолт | Проверить canonical-контракт, sync, parity, UI |
| Формула или коэффициент | Regression-тест, sync, parity, полный test |
| Упаковка или округление | Тест точной потребности, покупки и остатка, parity |
| Новый калькулятор | Engine, definition, registry, meta, parity, UI, SEO |

## Команды

```text
npm run sync:all
npm run test:parity
npm run lint
npm test
npm run build
npm run test:e2e
```

Запускать минимальный релевантный набор во время разработки. Перед коммитом выполнять полный `npm test`; build и E2E добавлять по риску задачи.

## Критерии готовности

- Один источник истины для расчёта.
- Внутренние единицы и порядок округления явны.
- Точная потребность не смешана с покупкой.
- Штучные упаковки целые и округлены вверх.
- Web и mobile синхронизированы.
- Пользователь видит допущения, запас и смысл результата.
- Генерируемые файлы получены командами, а не ручной правкой.
