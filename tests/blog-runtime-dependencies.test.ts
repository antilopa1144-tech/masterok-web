import DOMPurify from "isomorphic-dompurify";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("updated blog runtime dependencies", () => {
  it("keeps article figures but strips executable markup", () => {
    const html = DOMPurify.sanitize(
      '<figure><img src="https://getmasterok.ru/cover.webp" onerror="alert(1)"><figcaption>Подрезка плитки</figcaption></figure><script>alert(1)</script><a href="javascript:alert(1)">Ссылка</a>',
      {
        ADD_TAGS: ["figure", "figcaption", "iframe"],
        ADD_ATTR: ["loading", "fetchpriority", "target", "rel"],
      },
    );
    expect(html).toContain("<figcaption>Подрезка плитки</figcaption>");
    expect(html).toContain('src="https://getmasterok.ru/cover.webp"');
    expect(html).not.toMatch(/<script|onerror|javascript:/i);
  });

  it("supports the existing in-memory WebP conversion pipeline", async () => {
    const fixture = await sharp({ create: { width: 1600, height: 840, channels: 3, background: "#cb6230" } }).png().toBuffer();
    const output = await sharp(fixture, { animated: true }).rotate()
      .resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toBuffer();
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });
});
