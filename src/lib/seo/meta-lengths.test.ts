import { describe, expect, it } from "vitest";
import type { Metadata } from "next";
import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { buildCategoryTitle } from "@/lib/calculators/category-meta";
import { TOOL_CONFIGS } from "@/lib/tools/config";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import { TITLE_MAX_LENGTH, withSiteSuffix } from "@/lib/metadata";
import { metadata as homeMetadata } from "@/app/page";
import { metadata as aiMetadata } from "@/app/ai/page";
import { metadata as aboutMetadata } from "@/app/o-proekte/page";
import { metadata as appMetadata } from "@/app/prilozhenie/page";
import { metadata as projectsMetadata } from "@/app/proekty/page";
import { metadata as methodologyMetadata } from "@/app/metodologiya/page";
import { metadata as privacyMetadata } from "@/app/politika-konfidencialnosti/page";
import { metadata as calculatorsIndexMetadata } from "@/app/kalkulyatory/page";
import { metadata as toolsIndexMetadata } from "@/app/instrumenty/page";
import { metadata as blogIndexMetadata } from "@/app/blog/page";
import { metadata as mikhalychMetadata } from "@/app/mikhalych/page";

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

/**
 * Достаёт строку заголовка из Metadata. Next допускает три формы: строку,
 * `{ absolute }` и `{ default, template }` — buildPageMetadata всегда отдаёт
 * `absolute`, но тест не должен падать на типе, если форма когда-то изменится.
 */
function metadataTitle(metadata: Metadata): string {
  const title = metadata.title;
  if (typeof title === "string") return title;
  if (title && typeof title === "object" && "absolute" in title) return title.absolute;
  return "";
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
      const title = metadataTitle(metadata);
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
      ...TOOL_CONFIGS.map((tool) => metadataTitle(buildToolPageMetadata(tool.slug))),
    ];
    const duplicated = titles.filter((title) => (title.match(/Мастерок/g) ?? []).length > 1);
    expect(duplicated).toEqual([]);
  });

  /**
   * Статические страницы: главная, каталоги, служебные и справочные. До этого
   * они проверялись только замером собранного HTML, то есть новая правка текста
   * могла вывести заголовок или описание за лимит незамеченной.
   */
  it("держит лимиты на статических страницах", () => {
    const pages: Array<[string, Metadata]> = [
      ["/", homeMetadata],
      ["/ai/", aiMetadata],
      ["/o-proekte/", aboutMetadata],
      ["/prilozhenie/", appMetadata],
      ["/proekty/", projectsMetadata],
      ["/metodologiya/", methodologyMetadata],
      ["/politika-konfidencialnosti/", privacyMetadata],
      ["/kalkulyatory/", calculatorsIndexMetadata],
      ["/instrumenty/", toolsIndexMetadata],
      ["/blog/", blogIndexMetadata],
      ["/mikhalych/", mikhalychMetadata],
    ];

    const violations: string[] = [];
    for (const [path, metadata] of pages) {
      const title = metadataTitle(metadata);
      const description = metadata.description ?? "";
      if (!title) violations.push(`${path}: нет title`);
      else if (title.length > TITLE_MAX_LENGTH) violations.push(`${path}: title ${title.length}`);
      if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
        violations.push(`${path}: description ${description.length}`);
      }
      if ((title.match(/Мастерок/g) ?? []).length > 1) violations.push(`${path}: дубль бренда в title`);
    }
    expect(violations).toEqual([]);
  });
});
