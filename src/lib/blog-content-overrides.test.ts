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

  it("не меняет остальные статьи", () => {
    const post = makePost({ slug: "drugaya-statya" });
    expect(applyBlogContentOverrides(post)).toBe(post);
  });
});
