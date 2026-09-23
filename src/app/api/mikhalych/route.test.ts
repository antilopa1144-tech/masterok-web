import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.DEEPSEEK_API_KEY = "test-key-only";

const agent = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/mikhalych/agent", () => ({
  isMikhalychAgentEnabled: () => true,
  runMikhalychAgent: agent.run,
  runMikhalychAgentAsSseStream: vi.fn(),
  toOpenAIChatCompletionPayload: (result: { content: string }) => ({ choices: [{ message: { content: result.content } }] }),
}));

import { POST } from "./route";
import { defaultSettings } from "@/lib/commerce/config";
import { closeCommerceDatabase, database } from "@/lib/commerce/db";

const request = (photo?: string) => new NextRequest("http://localhost:3460/api/mikhalych", {
  method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.80", "user-agent": "route-test" },
  body: JSON.stringify({ messages: [{ role: "user", content: "Что купить?" }], photo, stream: false }),
});

beforeAll(async () => {
  const db = await database();
  await db.query("INSERT INTO commerce_settings(id,value) VALUES(1,$1)", [JSON.stringify({ ...defaultSettings(), freeAiWeeklyRequests: 1, proAiEnabled: true, aiInputKopecksPerMillion: 10000, aiOutputKopecksPerMillion: 10000, aiPriceCheckedAt: new Date().toISOString() })]);
  agent.run.mockResolvedValue({ content: "Нужно уточнить размеры", toolsUsed: [], calculatorLinks: [], projectEntries: [] });
});
afterAll(async () => { await closeCommerceDatabase(); });

describe("public Mikhalych route", () => {
  it("blocks guest photos and enforces the free quota before calling the agent", async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    const photo = `data:image/png;base64,${png.toString("base64")}`;
    expect((await POST(request(photo))).status).toBe(403);
    expect(agent.run).not.toHaveBeenCalled();
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(429);
    expect(agent.run).toHaveBeenCalledTimes(1);
  });
});
