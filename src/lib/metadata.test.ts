import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_NAME, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_URL, SITE_OG_IMAGE_WIDTH } from "@/lib/site";

describe("buildPageMetadata", () => {
  it("строит website metadata по умолчанию", () => {
    const metadata = buildPageMetadata({
      title: "Тестовая страница",
      description: "Описание страницы",
      url: "https://example.test/page/",
    });

    expect(metadata.title).toBe("Тестовая страница");
    expect(metadata.description).toBe("Описание страницы");
    expect(metadata.alternates?.canonical).toBe("https://example.test/page/");
    expect(metadata.openGraph?.title).toBe("Тестовая страница");
    expect(metadata.openGraph?.description).toBe("Описание страницы");
    expect(metadata.openGraph?.url).toBe("https://example.test/page/");
    expect(metadata.openGraph?.siteName).toBe(SITE_NAME);
    expect(metadata.openGraph?.locale).toBe("ru_RU");
    expect((metadata.openGraph as any)?.type).toBe("website");
    expect(metadata.openGraph?.images).toEqual([
      { url: SITE_OG_IMAGE_URL, width: SITE_OG_IMAGE_WIDTH, height: SITE_OG_IMAGE_HEIGHT },
    ]);
    expect((metadata.twitter as any)?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe("Тестовая страница");
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
      tags: ["ремонт", "плитка"],
    });

    expect((metadata.openGraph as any)?.type).toBe("article");
    expect(metadata.openGraph?.title).toBe("Статья");
    expect((metadata.openGraph as any)?.publishedTime).toBe("2026-03-12");
    expect((metadata.openGraph as any)?.tags).toEqual(["ремонт", "плитка"]);
    // Суффикс «| Мастерок» снимается до того как корневой layout добавит свой
    // через title.template — иначе получался бы дубликат «… | Мастерок | Мастерок».
    expect(metadata.title).toBe("Статья");
    expect(metadata.twitter?.title).toBe("Статья");
    expect(metadata.alternates?.canonical).toBe("https://example.test/article/");
  });

  it("снимает разные варианты суффикса с названием сайта", () => {
    const cases: Array<[string, string]> = [
      ["Калькулятор бетона | Мастерок", "Калькулятор бетона"],
      ["Калькулятор бетона — Мастерок", "Калькулятор бетона"],
      ["Калькулятор бетона - Мастерок", "Калькулятор бетона"],
      ["Калькулятор бетона  Мастерок", "Калькулятор бетона"],
      ["Калькулятор бетона", "Калькулятор бетона"],
    ];
    for (const [input, expected] of cases) {
      const metadata = buildPageMetadata({
        title: input,
        description: "x",
        url: "https://example.test/",
      });
      expect(metadata.title).toBe(expected);
    }
  });
});
