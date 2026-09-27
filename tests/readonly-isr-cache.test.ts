import { describe, expect, it, vi } from "vitest";
import FileSystemCache from "next/dist/server/lib/incremental-cache/file-system-cache";
import { nodeFs } from "next/dist/server/lib/node-fs-methods";
import type { CachedRouteKind, IncrementalCacheKind } from "next/dist/server/response-cache";
import nextConfig from "../next.config";

// Exercise Next's real cache against the EACCES restriction seen on Timeweb.
function readonlyCache(flushToDisk: boolean) {
  const writeFile = vi.fn(async () => {
    throw Object.assign(new Error("EACCES: build cache is read-only"), { code: "EACCES" });
  });
  const cache = new FileSystemCache({
    fs: { ...nodeFs, mkdir: async () => {}, writeFile },
    serverDistDir: "/app/.next/server",
    flushToDisk,
    maxMemoryCacheSize: nextConfig.cacheMaxMemorySize ?? 50 * 1024 * 1024,
    revalidatedTags: [],
    _requestHeaders: {},
  });
  return { cache, writeFile };
}

const fetchContext = { kind: "FETCH" as IncrementalCacheKind.FETCH, fetchCache: true as const, tags: ["readonly-test"] };
const routeContext = { kind: "APP_ROUTE" as IncrementalCacheKind.APP_ROUTE, fetchCache: false as const, isRoutePPREnabled: false, isFallback: false };
const fetchValue = (body: string) => ({
  kind: "FETCH" as CachedRouteKind.FETCH,
  data: { headers: {}, body, url: "http://cms.test/posts", status: 200 },
  revalidate: 60,
});
const routeValue = (body: string) => ({ kind: "APP_ROUTE" as CachedRouteKind.APP_ROUTE, body: Buffer.from(body), status: 200, headers: {} });

describe("ISR on read-only Timeweb build directories", () => {
  it("reproduces disk errors for both the CMS snapshot and sitemap", async () => {
    const { cache } = readonlyCache(true);
    await expect(cache.set("baseline-posts", fetchValue("v1"), fetchContext)).rejects.toMatchObject({ code: "EACCES" });
    await expect(cache.set("baseline-sitemap.xml", routeValue("v1"), routeContext)).rejects.toMatchObject({ code: "EACCES" });
    // Memory is written first: EACCES alone does not prove stale public content.
    expect((await cache.get("baseline-posts", fetchContext))?.value).toEqual(fetchValue("v1"));
  });

  it("updates content and sitemap and invalidates tags without writing build files", async () => {
    expect(nextConfig.experimental?.isrFlushToDisk).toBe(false);
    const { cache, writeFile } = readonlyCache(nextConfig.experimental!.isrFlushToDisk!);
    for (const version of ["v1", "v2"]) {
      await cache.set("fixed-posts", fetchValue(version), fetchContext);
      await cache.set("fixed-sitemap.xml", routeValue(version), routeContext);
    }
    expect((await cache.get("fixed-posts", fetchContext))?.value).toEqual(fetchValue("v2"));
    expect((await cache.get("fixed-sitemap.xml", routeContext))?.value).toEqual(routeValue("v2"));
    await cache.revalidateTag("readonly-test");
    expect(await cache.get("fixed-posts", fetchContext)).toBeNull();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
