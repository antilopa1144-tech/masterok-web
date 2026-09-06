import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_GHOST_API_URL = process.env.GHOST_API_URL;
const ORIGINAL_GHOST_CONTENT_API_KEY = process.env.GHOST_CONTENT_API_KEY;

async function importGhost() {
  vi.resetModules();
  return import("./ghost");
}

describe("Ghost blog availability guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (ORIGINAL_GHOST_API_URL === undefined) delete process.env.GHOST_API_URL;
    else process.env.GHOST_API_URL = ORIGINAL_GHOST_API_URL;

    if (ORIGINAL_GHOST_CONTENT_API_KEY === undefined) delete process.env.GHOST_CONTENT_API_KEY;
    else process.env.GHOST_CONTENT_API_KEY = ORIGINAL_GHOST_CONTENT_API_KEY;
  });

  it("не маскирует отсутствие Content API key пустым блогом", async () => {
    process.env.GHOST_API_URL = "https://cms.example.test";
    delete process.env.GHOST_CONTENT_API_KEY;
    const { fetchAllPosts } = await importGhost();

    await expect(fetchAllPosts()).rejects.toThrow("Сборка с пустым блогом остановлена");
  });

  it("останавливает публикацию, если Ghost неожиданно вернул ноль статей", async () => {
    process.env.GHOST_API_URL = "https://cms.example.test";
    process.env.GHOST_CONTENT_API_KEY = "test-content-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { fetchAllPosts } = await importGhost();

    await expect(fetchAllPosts()).rejects.toThrow("0 опубликованных статей");
  });

  it("сохраняет 404 отдельной статьи как штатный undefined", async () => {
    process.env.GHOST_API_URL = "https://cms.example.test";
    process.env.GHOST_CONTENT_API_KEY = "test-content-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ posts: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ));
    const { fetchPostBySlug } = await importGhost();

    await expect(fetchPostBySlug("net-takoy-stati")).resolves.toBeUndefined();
  });

  it("HTTP 404 Ghost не становится ошибкой доступности или повторным запросом", async () => {
    process.env.GHOST_API_URL = "https://cms.example.test";
    process.env.GHOST_CONTENT_API_KEY = "test-content-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("Not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchPostBySlug } = await importGhost();
    await expect(fetchPostBySlug("unknown")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("сохраняет точные timestamps CMS для новых редакций в пределах дня", async () => {
    process.env.GHOST_API_URL = "https://cms.example.test";
    process.env.GHOST_CONTENT_API_KEY = "test-content-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ posts: [{
      id: "post-id", slug: "timestamp-test", title: "Test", html: "<p>Text</p>",
      published_at: "2026-09-06T01:02:03.000Z", updated_at: "2026-09-06T02:03:04.000Z",
    }] }), { status: 200 })));
    const { fetchAllPosts } = await importGhost();
    const [post] = await fetchAllPosts();
    expect(post).toMatchObject({ ghostId: "post-id", date: "2026-09-06", publishedAtIso: "2026-09-06T01:02:03.000Z", updatedAtIso: "2026-09-06T02:03:04.000Z" });
  });
});
