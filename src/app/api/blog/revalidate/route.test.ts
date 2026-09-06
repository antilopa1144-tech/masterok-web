import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const revalidateTag = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath, revalidateTag }));

const { POST } = await import("./route");

const SECRET = "s".repeat(32);
const ORIGINAL_SECRET = process.env.BLOG_REVALIDATE_SECRET;
const validEvent = {
  event: "edited",
  postId: "ghost-post-42",
  revision: "rev-2026-09-06",
  slug: "rasschet-materialov",
};

function request(body: BodyInit | null, options?: { authorization?: string; contentType?: string; contentLength?: string }): Request {
  return new Request("https://example.test/api/blog/revalidate/", {
    method: "POST",
    headers: {
      authorization: options?.authorization ?? `Bearer ${SECRET}`,
      "content-type": options?.contentType ?? "application/json",
      ...(options?.contentLength ? { "content-length": options.contentLength } : {}),
    },
    body,
  });
}

describe("POST /api/blog/revalidate", () => {
  beforeEach(() => {
    process.env.BLOG_REVALIDATE_SECRET = SECRET;
    revalidatePath.mockReset();
    revalidateTag.mockReset();
  });

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.BLOG_REVALIDATE_SECRET;
    else process.env.BLOG_REVALIDATE_SECRET = ORIGINAL_SECRET;
  });

  it("invalidates only the fixed published-blog surfaces", async () => {
    const response = await POST(request(JSON.stringify(validEvent)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ accepted: true, publicReady: false });
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith("ghost-blog");
    expect(revalidatePath).toHaveBeenCalledTimes(9);
    expect(revalidatePath).toHaveBeenNthCalledWith(1, "/blog/");
    expect(revalidatePath).toHaveBeenNthCalledWith(2, "/blog/[slug]", "page");
    expect(revalidatePath).toHaveBeenNthCalledWith(3, "/blog/tag/[tag]", "page");
    expect(revalidatePath).toHaveBeenNthCalledWith(4, "/");
    expect(revalidatePath).toHaveBeenNthCalledWith(5, "/kalkulyatory/[category]", "page");
    expect(revalidatePath).toHaveBeenNthCalledWith(6, "/rss.xml");
    expect(revalidatePath).toHaveBeenNthCalledWith(7, "/sitemap/0.xml");
    expect(revalidatePath).toHaveBeenNthCalledWith(8, "/sitemap/4.xml");
    expect(revalidatePath).toHaveBeenNthCalledWith(9, "/llms.txt");
  });

  it("returns 503 before auth when the secret is absent or too short", async () => {
    delete process.env.BLOG_REVALIDATE_SECRET;
    expect((await POST(request(JSON.stringify(validEvent)))).status).toBe(503);

    process.env.BLOG_REVALIDATE_SECRET = "too-short";
    expect((await POST(request(JSON.stringify(validEvent)))).status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects missing or incorrect bearer auth without invalidating", async () => {
    expect((await POST(request(JSON.stringify(validEvent), { authorization: "" }))).status).toBe(401);
    expect((await POST(request(JSON.stringify(validEvent), { authorization: "Bearer wrong-secret" }))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects non-JSON, oversized, malformed and untrusted fields", async () => {
    expect((await POST(request(JSON.stringify(validEvent), { contentType: "text/plain" }))).status).toBe(415);
    expect((await POST(request("x".repeat(8193)))).status).toBe(413);
    expect((await POST(request(JSON.stringify(validEvent), { contentLength: "9000" }))).status).toBe(413);
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...validEvent, slug: "Bad/slug" })))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ ...validEvent, url: "https://attacker.test" })))).status).toBe(400);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("accepts all supported events and a valid previousSlug", async () => {
    for (const event of ["published", "edited", "unpublished", "deleted"]) {
      const response = await POST(request(JSON.stringify({ ...validEvent, event, previousSlug: "old-material" })));
      expect(response.status).toBe(200);
    }
    expect(revalidateTag).toHaveBeenCalledTimes(4);
  });
});
