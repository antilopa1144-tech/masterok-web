import { describe, expect, it } from "vitest";
import { blogSourceRevision } from "./blog-source-revision";

describe("public Ghost revision", () => {
  const post = { id: "42", slug: "remont", title: "Ремонт 🧱", html: "<p>Текст & пример</p>", published_at: "2026-09-06T00:00:00.000Z", updated_at: "2026-09-06T00:00:00.000Z", tags: [{ id: "1", name: "Плитка", slug: "plitka" }] };
  it("is stable and detects content edits even if timestamp did not change", () => {
    expect(blogSourceRevision(post)).toMatch(/^[a-f0-9]{64}$/);
    // Shared golden vector with the standalone Python publication worker.
    expect(blogSourceRevision(post)).toBe("f12fc91467fd4cfe3bdc9448f737e7a94c94db274e840836d3c7bb0a14da0c83");
    expect(blogSourceRevision({ ...post })).toBe(blogSourceRevision(post));
    expect(blogSourceRevision({ ...post, html: "<p>Новая редакция</p>" })).not.toBe(blogSourceRevision(post));
    expect(blogSourceRevision({ ...post, slug: "new-slug" })).not.toBe(blogSourceRevision(post));
  });
});
