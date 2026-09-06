# Evidence hand-off: security и publication runtime — 6 сентября 2026

## Фактически проверенный dependency graph

`package-lock.json` после `npm ci` зафиксировал совместимый с Next 15 граф:

- `next` и `eslint-config-next` — `15.5.25` (манифест ограничен веткой `^15.5.21`, без перехода на Next 16);
- `postcss` `8.5.28`, `nanoid` `3.3.18`, `undici` `7.29.0`, `dompurify` `3.4.13`;
- `sharp` `0.35.4`, `vite` `7.3.5`, `js-yaml` `4.3.1`, `brace-expansion` `1.1.18` и `2.1.4`, `vitest` `3.2.6`.

`npm audit` после установки: 0 critical и 0 high. Это не означает полного отсутствия риска: остаются production moderate `fflate` ([GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98)) и dev-only low `esbuild` ([GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)). Обновление `fflate` требует отдельной проверки PDF/ZIP-пути; его не включали в ограниченный пакет.

`sharp` обновлён до `0.35.4` после проверки совместимости: эта ветка требует Node.js >=20.9, а проверенная runtime-среда использует Node 24; Next 15.5.25 явно допускает `^0.35.4`. См. первичный [changelog Sharp 0.35.0](https://sharp.pixelplumbing.com/changelog/v0.35.0/) и [требования установки Sharp](https://sharp.pixelplumbing.com/install/).

## Проверки

- Focused publication/security tests на реально установленном Vitest 3.2.6: 42/42 passed.
- В чистой копии `output/publication-a-smoke-20260906/repo`: 200 test files, 3323/3323 tests passed; `npm run lint` без ошибок.
- Production lifecycle smoke в чистой копии: публикация после build — 51 с; правка без build — 61 с; снятие с публикации — 61 с; authenticated revalidation обновила контент сразу. При имитации Ghost 503 блог и RSS вернули 500, а не успешный пустой ответ. Артефакт: `output/publication-a-smoke-20260906/evidence/lifecycle.json`.
- Root `npm test`: 3307 passed, 2 failed. Оба известные unrelated sewage SEO assertions в `src/lib/calculators/__tests__/index.test.ts` (`metaDescription` не соответствует единому шаблону и не содержит ожидаемый intent).

Проверка не подтверждает deployment, CI или push: это остаётся отдельным этапом релизного процесса.
