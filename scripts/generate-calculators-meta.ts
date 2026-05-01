#!/usr/bin/env npx tsx
/**
 * generate-calculators-meta.ts
 *
 * Генерирует src/lib/calculators/meta.generated.ts — lite-массив CalculatorMeta
 * для всех калькуляторов, БЕЗ heavy-полей (fields, faq, seoContent, calculate).
 *
 * Зачем: страницы которые показывают только списки/ссылки (главная, категории,
 * поиск, Footer, related links) импортируют meta.generated.ts и НЕ тащат в
 * client-bundle весь SEO-контент 66 калькуляторов (~250-300 KB First Load JS).
 *
 * Источник истины — ALL_CALCULATORS из src/lib/calculators/index.ts.
 *
 * Когда запускать:
 *  - При добавлении/удалении калькуляторов
 *  - При изменении meta-полей (title, slug, popularity, tags...)
 *  - Перед каждым `next build` (npm prebuild автоматизирует)
 *
 * CI-проверка соответствия: src/lib/calculators/__tests__/meta-sync.test.ts
 *
 * Usage:
 *   npx tsx scripts/generate-calculators-meta.ts
 */

import * as fs from "fs";
import * as path from "path";
import { ALL_CALCULATORS } from "../src/lib/calculators";

const OUTPUT_PATH = path.resolve(__dirname, "../src/lib/calculators/meta.generated.ts");

const meta = ALL_CALCULATORS.map((c) => ({
  id: c.id,
  slug: c.slug,
  title: c.title,
  h1: c.h1,
  description: c.description,
  metaTitle: c.metaTitle,
  metaDescription: c.metaDescription,
  category: c.category,
  categorySlug: c.categorySlug,
  tags: c.tags,
  popularity: c.popularity,
  complexity: c.complexity,
}));

const fileContent = `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Source: src/lib/calculators/index.ts (ALL_CALCULATORS)
// Generator: scripts/generate-calculators-meta.ts
//
// Этот файл — lite-проекция ALL_CALCULATORS для импорта в clientside коде, где
// не нужны heavy-поля (fields, faq, seoContent, calculate). Импорт сюда экономит
// ~250-300 KB First Load JS на странице калькулятора и главной.
//
// Если выглядит не синхронным с ALL_CALCULATORS — запусти:
//   npx tsx scripts/generate-calculators-meta.ts
//
// CI-проверка соответствия в meta-sync.test.ts
import type { CalculatorMeta } from "./types";

export const ALL_CALCULATORS_META: CalculatorMeta[] = ${JSON.stringify(meta, null, 2)};

export const getCalculatorMetaBySlug = (slug: string): CalculatorMeta | undefined =>
  ALL_CALCULATORS_META.find((c) => c.slug === slug);

export const getCalculatorMetaById = (id: string): CalculatorMeta | undefined =>
  ALL_CALCULATORS_META.find((c) => c.id === id);

export const getCalculatorsMetaByCategory = (categoryId: string): CalculatorMeta[] =>
  ALL_CALCULATORS_META.filter((c) => c.category === categoryId);

export const getPopularCalculatorsMeta = (limit = 8): CalculatorMeta[] =>
  [...ALL_CALCULATORS_META].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
`;

fs.writeFileSync(OUTPUT_PATH, fileContent, "utf-8");
console.log(`✓ Generated ${OUTPUT_PATH}`);
console.log(`  ${meta.length} calculators meta synced`);
