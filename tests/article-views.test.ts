import { describe, expect, it } from "vitest";
import { articleVisitor, validViewCount, VIEW_WINDOW_MS } from "@/lib/article-views";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe("article views", () => {
  it("reuses the same article visitor across reloads and the counting boundary", () => {
    const state = storage();
    const id = articleVisitor(state, "article", 1000);
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(articleVisitor(state, "article", 2000)).toBe(id);
    expect(articleVisitor(state, "article", VIEW_WINDOW_MS + 2000)).toBe(id);
    expect(articleVisitor(state, "another", 2000)).not.toBe(id);
  });
  it("rotates expired identifiers and recovers malformed storage", () => {
    const state = storage();
    const id = articleVisitor(state, "a", 0);
    expect(articleVisitor(state, "a", 86400001)).not.toBe(id);
    state.setItem("masterok:article-view:a", "{broken");
    expect(articleVisitor(state, "a", 1000)).toMatch(/^[a-f0-9-]{36}$/);
  });
  it("does not register when storage is unavailable", () => {
    expect(articleVisitor({ getItem() { throw Error("denied"); }, setItem() {} }, "a")).toBeNull();
    expect(articleVisitor({ getItem() { return null; }, setItem() { throw Error("full"); } }, "a")).toBeNull();
  });
  it("accepts only nonnegative safe integer totals", () => {
    for (const input of [-1, NaN, Infinity, "12", null, {}, 2.5, Number.MAX_SAFE_INTEGER + 1]) expect(validViewCount(input)).toBe(false);
    for (const input of [0, 1, 1000000]) expect(validViewCount(input)).toBe(true);
  });
});
