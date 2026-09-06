import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAllPosts: vi.fn(),
  fetchPostBySlug: vi.fn(),
  // No cache in this unit adapter: Next owns TTL/invalidation, not blog.ts.
  unstable_cache: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));
vi.mock("next/cache", () => ({ unstable_cache: mocks.unstable_cache }));
vi.mock("./ghost", () => mocks);

describe("blog runtime freshness", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.fetchAllPosts.mockReset();
    mocks.fetchPostBySlug.mockReset();
  });

  it("uses a bounded invalidatable Next cache, not a permanent module snapshot", async () => {
    const { getAllPosts } = await import("./blog");
    mocks.fetchAllPosts.mockResolvedValueOnce([{ slug: "old" }]).mockResolvedValueOnce([{ slug: "new" }]);
    expect(await getAllPosts()).toEqual([{ slug: "old" }]);
    expect(await getAllPosts()).toEqual([{ slug: "new" }]);
    expect(mocks.unstable_cache).toHaveBeenCalledWith(expect.any(Function), expect.any(Array), {
      revalidate: 60, tags: ["ghost-blog"],
    });
  });

  it("new and unpublished slugs follow the current shared published catalogue", async () => {
    const { getAllPosts, getPostBySlug } = await import("./blog");
    mocks.fetchAllPosts.mockResolvedValueOnce([{ slug: "old" }]).mockResolvedValueOnce([{ slug: "new" }]).mockResolvedValueOnce([{ slug: "new" }]);
    await getAllPosts();
    expect(await getPostBySlug("new")).toEqual({ slug: "new" });
    expect(await getPostBySlug("old")).toBeUndefined();
    expect(mocks.fetchPostBySlug).not.toHaveBeenCalled();
  });

  it("does not convert a CMS failure into not-found", async () => {
    const { getPostBySlug } = await import("./blog");
    mocks.fetchAllPosts.mockRejectedValueOnce(new Error("CMS unavailable"));
    await expect(getPostBySlug("new")).rejects.toThrow("CMS unavailable");
  });
});
