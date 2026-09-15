import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { metadata } from "@/app/services/video/page";
import { MASTEROK_SOCIAL_LINKS, SITE_URL } from "@/lib/site";

describe("страница услуги анимационных роликов", () => {
  it("показывает честные форматы, цены и ограничения", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src", "app", "services", "video", "page.tsx"),
      "utf8",
    );
    const contactButtonSource = readFileSync(
      path.join(process.cwd(), "src", "components", "services", "VideoServiceContactButton.tsx"),
      "utf8",
    );

    expect(source).toContain("Короткие анимационные ролики");
    expect(source).toContain("от 4 990 ₽");
    expect(source).toContain("от 8 990 ₽");
    expect(source).toContain("Новая 3D-модель персонажа");
    expect(source).toContain('placement="hero"');
    expect(contactButtonSource).toContain('children = "Обсудить ролик"');
    expect(source).toContain('id="channels"');
    expect(source).toContain('"@type": "Service"');
    expect(source).toContain('"@type": "FAQPage"');
  });

  it("содержит три чистые внешние ссылки без временных параметров", () => {
    expect(MASTEROK_SOCIAL_LINKS).toHaveLength(3);
    expect(MASTEROK_SOCIAL_LINKS.map((link) => link.platform)).toEqual([
      "youtube",
      "tiktok",
      "instagram",
    ]);

    for (const link of MASTEROK_SOCIAL_LINKS) {
      const url = new URL(link.href);
      expect(url.protocol).toBe("https:");
      expect(url.search).toBe("");
    }
  });

  it("задаёт канонический адрес и отдельную широкую обложку", () => {
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/services/video/`);
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: `${SITE_URL}/services/video-production-og.webp`,
        width: 1200,
        height: 630,
      }),
    ]);
  });
});
