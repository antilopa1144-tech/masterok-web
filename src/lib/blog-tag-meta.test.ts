import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  buildTagDescription,
  buildTagTitle,
  postsWord,
  trimTagName,
} from "./blog-tag-meta";
import { TITLE_MAX_LENGTH, withSiteSuffix } from "./metadata";

/** Обрезка статьи: теги приходят из Ghost и могут быть любой длины. */
function postTitle(index: number, length = 40): string {
  return `Статья номер ${index}${" о расчёте материалов".repeat(3)}`.slice(0, length);
}

describe("метаданные страницы тега", () => {
  it("держит title в лимите выдачи для любого имени тега", () => {
    for (let length = 1; length <= 80; length += 1) {
      const tag = "т".repeat(length);
      const title = withSiteSuffix(buildTagTitle(tag));
      expect(title.length, `длина тега ${length}: ${title}`).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
    }
  });

  it("держит description в диапазоне 120–165 для любого имени тега и числа статей", () => {
    for (let tagLength = 1; tagLength <= 80; tagLength += 1) {
      const tag = "т".repeat(tagLength);
      for (const count of [0, 1, 2, 4, 5, 11, 25]) {
        const titles = Array.from({ length: count }, (_, i) => postTitle(i));
        const description = buildTagDescription(tag, titles);
        expect(
          description.length,
          `тег ${tagLength} симв., статей ${count}: ${description.length}`,
        ).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
        expect(
          description.length,
          `тег ${tagLength} симв., статей ${count}: ${description.length}`,
        ).toBeLessThanOrEqual(DESCRIPTION_MAX);
      }
    }
  });

  it("на реальных тегах выбирает вариант с заголовками, когда он укладывается", () => {
    const description = buildTagDescription("Раскладка", [
      "Откуда начинать раскладку плитки",
      "Раскладка ламината на треть",
    ]);
    expect(description).toContain("Откуда начинать раскладку плитки");
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("на одном коротком заголовке уходит в счётчик: вариант с заголовком короче 120", () => {
    const description = buildTagDescription("Раскладка", [
      "Откуда начинать раскладку плитки: от центра или от края",
    ]);
    expect(description).toContain("1 материал");
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("на длинных заголовках статей переходит к счётчику", () => {
    const titles = [postTitle(1, 80), postTitle(2, 80), postTitle(3, 80)];
    const description = buildTagDescription("ламинат", titles);
    expect(description).toContain("3 материала");
    expect(description).not.toContain(titles[0]);
  });

  it("подрезает слишком длинное имя тега", () => {
    const tag = "очень длинное имя тега которое не влезает в описание целиком";
    const description = buildTagDescription(tag, [postTitle(1), postTitle(2)]);
    expect(description).toContain("…");
    expect(description).not.toContain(tag);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("склоняет слово «материал» по числу статей", () => {
    expect(postsWord(1)).toBe("материал");
    expect(postsWord(3)).toBe("материала");
    expect(postsWord(5)).toBe("материалов");
    expect(postsWord(11)).toBe("материалов");
  });

  it("обрезает имя тега по границе слова", () => {
    expect(trimTagName("раскладка плитки на стену", 12)).toBe("раскладка…");
    expect(trimTagName("короткий", 20)).toBe("короткий");
  });
});
