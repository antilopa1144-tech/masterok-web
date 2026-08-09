import { describe, expect, it } from "vitest";
import type { BlogPost } from "./blog";
import { applyBlogContentOverrides } from "./blog-content-overrides";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: "skolko-proflista-na-zabor",
    title: "Сколько профлиста нужно на забор: расчёт по длине",
    description: "Старое описание",
    date: "2026-03-01",
    readTime: "7 мин",
    category: "Фасад",
    icon: "🔩",
    tags: ["забор", "профнастил"],
    internalTags: [],
    heroImage: "",
    heroImageAlt: "",
    content:
      '<p><a href="https://getmasterok.ru/kalkulyatory/krovlya/krovlya/">профнастила</a></p><h2 id="formula">Формула</h2>',
    ...overrides,
  };
}

describe("applyBlogContentOverrides", () => {
  it("исправляет сниппет, перелинковку и добавляет таблицу быстрых ответов", () => {
    const result = applyBlogContentOverrides(makePost());

    expect(result.title).toContain("20, 30 и 50 м");
    expect(result.metaTitle).toContain("20, 30 и 50 м");
    expect(result.description).toContain("таблица для С8 и С21");
    expect(result.content).toContain('id="skolko-listov-20-30-50"');
    expect(result.content).toContain('href="/kalkulyatory/fasad/zabor/"');
    expect(result.content).not.toContain("/kalkulyatory/krovlya/krovlya/");
  });

  it("не дублирует таблицу при повторном применении", () => {
    const once = applyBlogContentOverrides(makePost());
    const twice = applyBlogContentOverrides(once);

    expect(twice.content.match(/id="skolko-listov-20-30-50"/g)).toHaveLength(1);
  });

  it("исправляет статью о стяжке тёплого пола и ведёт в калькулятор стяжки", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "tolshchina-styazhki-pod-teplyy-pol",
      title: "Толщина стяжки под тёплый пол: золотая середина",
      content: "<p>СП 29.13330.2023 требует одно, а минимальный слой 35 мм — другое.</p>",
      relatedCalculator: { slug: "teplyy-pol", categorySlug: "poly" },
    }));

    expect(result.title).toBe(
      "Толщина стяжки для тёплого пола: слой над трубой и общая высота",
    );
    expect(result.metaTitle).toContain("над трубой и общая");
    expect(result.description).toContain("требования СП");
    expect(result.relatedCalculator).toEqual({ slug: "styazhka", categorySlug: "poly" });
    expect(result.content).toContain("не менее 61 мм");
    expect(result.content).toContain('href="/kalkulyatory/poly/styazhka/"');
    expect(result.content).toContain(
      'href="/kalkulyatory/inzhenernye/vodyanoy-teplyy-pol/"',
    );
    expect(result.content).not.toContain("СП 29.13330.2023");
    expect(result.content).not.toContain("минимальный слой 35 мм");
  });

  it("идемпотентно применяет полную замену статьи о стяжке тёплого пола", () => {
    const post = makePost({ slug: "tolshchina-styazhki-pod-teplyy-pol" });
    const once = applyBlogContentOverrides(post);
    const twice = applyBlogContentOverrides(once);

    expect(twice).toEqual(once);
  });

  it("заменяет статью о расчёте ГКЛ на проверяемую методику для стены", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "rasschitat-gipsokarton-na-stenu",
      title: "Как рассчитать гипсокартон",
      content: "<p>Лист 3000 × 1200 мм имеет площадь 3,5 м².</p>",
    }));

    expect(result.title).toContain("Расчёт гипсокартона на стену");
    expect(result.metaTitle).toContain("листы и профиль");
    expect(result.description).toContain("пример стены 4 × 2,7 м");
    expect(result.relatedCalculator).toEqual({ slug: "gipsokarton", categorySlug: "steny" });
    expect(result.content).toContain("1,2 × 3,0");
    expect(result.content).toContain("3,6 м²");
    expect(result.content).toContain("минимум 4 целых листа");
    expect(result.content).toContain("Реальном");
    expect(result.content).toContain("КНАУФ С 623");
    expect(result.content).not.toContain("3,5 м²");
  });

  it("идемпотентно применяет полную замену статьи о расчёте ГКЛ", () => {
    const post = makePost({ slug: "rasschitat-gipsokarton-na-stenu" });
    const once = applyBlogContentOverrides(post);
    const twice = applyBlogContentOverrides(once);

    expect(twice).toEqual(once);
  });

  it("заменяет статью о доме 10×10 на расчёт с явными допущениями", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "skolko-kirpicha-na-dom-10x10",
      title: "Точный расчёт 2026 года",
      content: "<p>Ошибки проектирования сведены к минимуму.</p>",
    }));

    expect(result.title).toContain("Сколько кирпича нужно на дом 10×10");
    expect(result.description).toContain("одноэтажный дом 10 × 10 м");
    expect(result.relatedCalculator).toEqual({ slug: "kirpich", categorySlug: "steny" });
    expect(result.content).toContain("чистая площадь кладки составит 105 м²");
    expect(result.content).toContain("16 065");
    expect(result.content).toContain("16 869");
    expect(result.content).toContain("не определяет несущую способность");
    expect(result.content).not.toContain("Ошибки проектирования сведены к минимуму");
  });

  it("идемпотентно применяет замену статьи о доме 10×10", () => {
    const post = makePost({ slug: "skolko-kirpicha-na-dom-10x10" });
    const once = applyBlogContentOverrides(post);
    expect(applyBlogContentOverrides(once)).toEqual(once);
  });

  it("не меняет остальные статьи", () => {
    const post = makePost({ slug: "drugaya-statya" });
    expect(applyBlogContentOverrides(post)).toBe(post);
  });
});
