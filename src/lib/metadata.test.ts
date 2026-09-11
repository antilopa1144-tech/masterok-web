import { describe, expect, it } from "vitest";
import { buildPageMetadata, withSiteSuffix, TITLE_MAX_LENGTH } from "@/lib/metadata";
import { SITE_NAME, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_URL, SITE_OG_IMAGE_WIDTH } from "@/lib/site";

/** Достаёт строку заголовка из результата: теперь это { absolute }. */
const titleOf = (metadata: ReturnType<typeof buildPageMetadata>): string =>
  typeof metadata.title === "string" ? metadata.title : String((metadata.title as { absolute?: string })?.absolute);

describe("buildPageMetadata", () => {
  it("строит website metadata по умолчанию", () => {
    const metadata = buildPageMetadata({
      title: "Тестовая страница",
      description: "Описание страницы",
      url: "https://example.test/page/",
    });

    // Короткий заголовок получает суффикс бренда здесь же: раньше это делал
    // шаблон корневого layout, теперь решение принимает withSiteSuffix().
    expect(titleOf(metadata)).toBe(`Тестовая страница — ${SITE_NAME}`);
    expect(metadata.description).toBe("Описание страницы");
    expect(metadata.alternates?.canonical).toBe("https://example.test/page/");
    expect(metadata.openGraph?.title).toBe(`Тестовая страница — ${SITE_NAME}`);
    expect(metadata.openGraph?.description).toBe("Описание страницы");
    expect(metadata.openGraph?.url).toBe("https://example.test/page/");
    expect(metadata.openGraph?.siteName).toBe(SITE_NAME);
    expect(metadata.openGraph?.locale).toBe("ru_RU");
    expect((metadata.openGraph as any)?.type).toBe("website");
    expect(metadata.openGraph?.images).toEqual([
      { url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT },
    ]);
    expect((metadata.twitter as any)?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe(`Тестовая страница — ${SITE_NAME}`);
    expect(metadata.twitter?.description).toBe("Описание страницы");
    expect(metadata.twitter?.images).toEqual([SITE_OG_IMAGE_URL]);
  });

  it("поддерживает article metadata и дополнительные og-поля", () => {
    const metadata = buildPageMetadata({
      title: "Статья | Мастерок",
      openGraphTitle: "Статья",
      twitterTitle: "Статья | Мастерок",
      description: "Описание статьи",
      url: "https://example.test/article/",
      type: "article",
      publishedTime: "2026-03-12",
      modifiedTime: "2026-03-12T18:30:00.000Z",
      tags: ["ремонт", "плитка"],
    });

    expect((metadata.openGraph as any)?.type).toBe("article");
    expect(metadata.openGraph?.title).toBe(`Статья — ${SITE_NAME}`);
    expect((metadata.openGraph as any)?.publishedTime).toBe("2026-03-12");
    expect((metadata.openGraph as any)?.modifiedTime).toBe("2026-03-12T18:30:00.000Z");
    expect((metadata.openGraph as any)?.tags).toEqual(["ремонт", "плитка"]);
    expect(titleOf(metadata)).toBe(`Статья — ${SITE_NAME}`);
    expect(metadata.twitter?.title).toBe(`Статья — ${SITE_NAME}`);
    expect(metadata.alternates?.canonical).toBe("https://example.test/article/");
  });

  it("снимает разные варианты суффикса с названием сайта", () => {
    // На входе — разные формы уже проставленного бренда, на выходе один и тот же
    // короткий заголовок, к которому хелпер добавляет бренд ровно один раз.
    const cases: string[] = [
      "Калькулятор бетона | Мастерок",
      "Калькулятор бетона — Мастерок",
      "Калькулятор бетона - Мастерок",
      "Калькулятор бетона  Мастерок",
      "Калькулятор бетона",
    ];
    for (const input of cases) {
      const metadata = buildPageMetadata({
        title: input,
        description: "x",
        url: "https://example.test/",
      });
      const title = titleOf(metadata);
      expect(title).toBe(`Калькулятор бетона — ${SITE_NAME}`);
      // Бренд ровно один раз — дубля быть не должно.
      expect((title.match(new RegExp(SITE_NAME, "g")) || []).length).toBe(1);
    }
  });
});

/**
 * Суффикс бренда ставится только если заголовок остаётся в пределах выдачи.
 * Раньше он дописывался шаблоном безусловно, и 30 заголовков из 148 выходили
 * за 60 символов — все они без суффикса укладываются в 50–59.
 */
describe("withSiteSuffix", () => {
  it("добавляет бренд, когда заголовок влезает в лимит", () => {
    const result = withSiteSuffix("Калькулятор плитки");
    expect(result).toBe(`Калькулятор плитки — ${SITE_NAME}`);
    expect(result.length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
  });

  it("не добавляет бренд, когда заголовок вышел бы за лимит", () => {
    const long = "Электрика в квартире: группы, автоматы, УЗО, сечение кабеля";
    expect(long.length).toBeGreaterThan(TITLE_MAX_LENGTH - 11);
    expect(withSiteSuffix(long)).toBe(long);
  });

  it("не превышает лимит ни на одном случае", () => {
    const samples = [
      "Калькулятор плитки",
      "Электрика в квартире: группы, автоматы, УЗО, сечение кабеля",
      "Сколько рулонов обоев нужно на комнату: расчёт с раппортом",
      "Методология расчётов",
      "Таблица норм расхода строительных материалов на 1 м²",
    ];
    for (const sample of samples) {
      expect(withSiteSuffix(sample).length).toBeLessThanOrEqual(TITLE_MAX_LENGTH);
    }
  });

  it("не дублирует бренд, если он уже в заголовке", () => {
    const result = withSiteSuffix(`Калькулятор плитки — ${SITE_NAME}`);
    expect((result.match(new RegExp(SITE_NAME, "g")) || []).length).toBe(1);
  });

  it("граница: ровно лимит оставляет бренд, на символ больше — убирает", () => {
    const base = "х".repeat(TITLE_MAX_LENGTH - 11);
    expect(withSiteSuffix(base)).toBe(`${base} — ${SITE_NAME}`);
    expect(withSiteSuffix("х".repeat(TITLE_MAX_LENGTH - 10))).toBe("х".repeat(TITLE_MAX_LENGTH - 10));
  });
});
