#!/usr/bin/env npx tsx
/**
 * generate-route-manifest.ts
 *
 * Генерирует src/lib/seo/route-manifest.generated.ts — плоские списки валидных
 * маршрутов для middleware.
 *
 * Зачем: несуществующие slug и категории под /kalkulyatory/* и /instrumenty/*
 * отдавали HTTP 200 с пустым телом (мягкие 404). Причина — notFound() вызывается
 * уже после старта стриминга, когда код ответа отправлен. Middleware работает до
 * рендера, поэтому он единственное место, где статус можно гарантировать.
 *
 * Но middleware исполняется на Edge и не может импортировать модули с Node-зависимостями
 * (calculators → spec JSON, tools/config → и т.п.). Поэтому здесь мы заранее
 * выгружаем только строки: slug категорий, slug калькуляторов и карту
 * «slug калькулятора → его категория» для редиректов.
 *
 * Источник истины — те же модули, что и у приложения: ALL_CALCULATORS_META,
 * CATEGORIES, TOOL_CONFIGS, ALL_CHECKLISTS.
 *
 * Usage: npx tsx scripts/generate-route-manifest.ts
 */

import * as fs from "fs";
import * as path from "path";
import { ALL_CALCULATORS_META } from "../src/lib/calculators/meta.generated";
import { CATEGORIES } from "../src/lib/calculators/categories";
import { TOOL_CONFIGS } from "../src/lib/tools/config";
import { ALL_CHECKLISTS } from "../src/lib/checklists";

const OUTPUT_PATH = path.resolve(__dirname, "../src/lib/seo/route-manifest.generated.ts");

const categorySlugs = CATEGORIES.map((c) => c.slug).sort();
const calculatorSlugs = ALL_CALCULATORS_META.map((c) => c.slug).sort();
/** slug калькулятора → каноническая категория. Нужна для 301 при чужой категории. */
const calculatorCategory: Record<string, string> = {};
for (const c of ALL_CALCULATORS_META) calculatorCategory[c.slug] = c.categorySlug;

const toolSlugs = TOOL_CONFIGS.filter((t) => !t.noindex).map((t) => t.slug).sort();
const checklistSlugs = ALL_CHECKLISTS.map((c) => c.slug).sort();

const fileContent = `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Source: ALL_CALCULATORS_META, CATEGORIES, TOOL_CONFIGS, ALL_CHECKLISTS
// Generator: scripts/generate-route-manifest.ts
//
// Назначение — валидация адресов в middleware (Edge runtime) до начала стриминга,
// чтобы несуществующие страницы отдавали настоящий 404, а не 200 с пустым телом.
// Здесь только строки: middleware не должен тянуть Node-зависимости приложения.
//
// Синхронность с источниками проверяет тест route-manifest-sync.test.ts.
// Обновить: npm run sync:routes

/** Категории калькуляторов: /kalkulyatory/<category>/ */
export const ROUTE_CATEGORY_SLUGS: readonly string[] = ${JSON.stringify(categorySlugs, null, 2)};

/** Slug калькуляторов: /kalkulyatory/<category>/<slug>/ */
export const ROUTE_CALCULATOR_SLUGS: readonly string[] = ${JSON.stringify(calculatorSlugs, null, 2)};

/** Каноническая категория калькулятора — для 301 при обращении по чужой категории. */
export const ROUTE_CALCULATOR_CATEGORY: Readonly<Record<string, string>> = ${JSON.stringify(calculatorCategory, null, 2)};

/** Slug инструментов: /instrumenty/<slug>/ */
export const ROUTE_TOOL_SLUGS: readonly string[] = ${JSON.stringify(toolSlugs, null, 2)};

/** Slug чек-листов: /instrumenty/chek-listy/<slug>/ */
export const ROUTE_CHECKLIST_SLUGS: readonly string[] = ${JSON.stringify(checklistSlugs, null, 2)};
`;

fs.writeFileSync(OUTPUT_PATH, fileContent, "utf-8");
console.log(`✓ Generated ${OUTPUT_PATH}`);
console.log(`  категорий: ${categorySlugs.length}`);
console.log(`  калькуляторов: ${calculatorSlugs.length}`);
console.log(`  инструментов: ${toolSlugs.length}`);
console.log(`  чек-листов: ${checklistSlugs.length}`);
