import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BlogPostNotFound from "./not-found";
import { MISSING_POST_METADATA } from "./missing-post-metadata";

describe("404 несуществующей статьи", () => {
  it("показывает полезное сообщение и безопасные пути выхода", () => {
    const html = renderToStaticMarkup(React.createElement(BlogPostNotFound));

    expect(html).toContain("Статья не найдена");
    expect(html).toContain("Ошибка 404");
    expect(html).toContain('href="/blog"');
    expect(html).toContain('href="/kalkulyatory"');
    expect(html).toContain('href="/kalkulyatory/poly/laminat"');
    expect(html).not.toContain("Страница не найдена | Мастерок");
  });

  it("задаёт noindex без раннего вызова notFound из metadata", () => {
    expect(MISSING_POST_METADATA.title).toEqual({ absolute: "Статья не найдена | Мастерок" });
    expect(MISSING_POST_METADATA.robots).toEqual({ index: false, follow: true });
  });
});
