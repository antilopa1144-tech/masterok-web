import { describe, expect, it, vi } from "vitest";
const upstream = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock("./deepseek-upstream", () => ({ getMikhalychChatModel: () => "deepseek-flash", mikhalychChatCompletion: upstream.complete }));
import { describePhoto, validatePhoto } from "./photo";

describe("photo input", () => {
  it("accepts image bytes, not only a claimed MIME type", () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    expect(validatePhoto(`data:image/png;base64,${png.toString("base64")}`)).toContain("image/png");
    expect(() => validatePhoto(`data:image/jpeg;base64,${png.toString("base64")}`)).toThrow("Формат фото не совпадает");
    expect(() => validatePhoto(`data:image/png;base64,${"A".repeat(2_700_000)}`)).toThrow("Фото слишком большое");
  });
  it("sends an image block to Flash and keeps the result preliminary", async () => {
    upstream.complete.mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: "Виден фрагмент стены; размеры неизвестны." } }] }) });
    await expect(describePhoto("data:image/png;base64,AAAA", "Что на стене?")).resolves.toContain("размеры неизвестны");
    const request = upstream.complete.mock.calls[0]?.[0] as { model: string; messages: { content: { type: string; image_url?: { url: string }; text?: string }[] }[] };
    expect(request.model).toBe("deepseek-flash");
    expect(request.messages[0].content[1].image_url?.url).toBe("data:image/png;base64,AAAA");
    expect(request.messages[0].content[0].text).toContain("Не выдумывай размеры");
  });
});
