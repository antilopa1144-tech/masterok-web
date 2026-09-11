import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { buildCategoryTitle } from "@/lib/calculators/category-meta";
import { TOOL_CONFIGS } from "@/lib/tools/config";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { TITLE_MAX_LENGTH, withSiteSuffix } from "@/lib/metadata";

/**
 * Волна 2 SEO-аудита: 30 заголовков из 148 выходили за 60 символов, потому что
 * бренд дописывался шаблоном layout безусловно, а 30 описаний не попадали
 * в комфортный диапазон выдачи 120–165.
 *
 * Проверка на собранной странице ловит только существующие страницы: новый
 * калькулятор или инструмент с длинным meta_title пройдёт незамеченным до
 * деплоя. Этот тест считает итоговую длину так же, как её считает
 * buildPageMetadata, и падает на источнике.
 */
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 165;

/** Итоговый title = заголовок страницы, к которому хелпер добавил бренд. */
function finalTitle(pageTitle: string): string {
  return withSiteSuffix(pageTitle);
}

describe("длина title и description по всем источникам метаданных", () => {
  it("укладывает title всех калькуляторов в лимит выдачи", () => {
    const tooLong = ALL_CALCULATORS_META.map((calc) => ({
      slug: calc.slug,
      title: finalTitle(calc.metaTitle),
    })).filter((item) => item.title.length > TITLE_MAX_LENGTH);

    expect(
      tooLong.map((item) => `${item.slug}: ${item.title.length} — ${item.title}`),
      "title длиннее лимита",
    ).toEqual([]);
  });

  it("держит description калькуляторов в диапазоне 120–165", () => {
    const outOfRange = ALL_CALCULATORS_META.map((calc) => ({
      slug: calc.slug,
      length: calc.metaDescription.length,
    })).filter((item) => item.length < DESCRIPTION_MIN || item.length > DESCRIPTION_MAX);

    expect(
      outOfRange.map((item) => `${item.slug}: ${item.length}`),
      "description вне диапазона",
    ).toEqual([]);
  });

  it("укладывает title и description страниц категорий", () => {
    for (const cat of CATEGORIES) {
      const title = finalTitle(buildCategoryTitle(cat));
      expect(title.length, `${cat.slug}: ${title}`).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
      expect(cat.metaDescription.length, `${cat.slug}: description`).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
      expect(cat.metaDescription.length, `${cat.slug}: description`).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("укладывает title и description инструментов, у которых нет страничных переопределений", () => {
    const violations: string[] = [];
    for (const tool of TOOL_CONFIGS) {
      // У noindex-страниц (арифметический калькулятор) длина описания в выдаче
      // не важна: страница не попадает в sitemap и закрыта от индексации.
      if (tool.noindex) continue;
      const metadata = buildToolPageMetadata(tool.slug);
      const title = typeof metadata.title === "string" ? metadata.title : metadata.title?.absolute;
      if (!title || !metadata.description) continue;
      if (title.length > TITLE_MAX_LENGTH) violations.push(`${tool.slug}: title ${title.length}`);
      if (metadata.description.length < DESCRIPTION_MIN || metadata.description.length > DESCRIPTION_MAX) {
        violations.push(`${tool.slug}: description ${metadata.description.length}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("не оставляет дубля бренда ни на одном источнике", () => {
    const titles = [
      ...ALL_CALCULATORS_META.map((calc) => finalTitle(calc.metaTitle)),
      ...CATEGORIES.map((cat) => finalTitle(buildCategoryTitle(cat))),
      ...TOOL_CONFIGS.map((tool) => {
        const metadata = buildToolPageMetadata(tool.slug);
        return typeof metadata.title === "string" ? metadata.title : (metadata.title?.absolute ?? "");
      }),
    ];
    const duplicated = titles.filter((title) => (title.match(/Мастерок/g) ?? []).length > 1);
    expect(duplicated).toEqual([]);
  });
});
