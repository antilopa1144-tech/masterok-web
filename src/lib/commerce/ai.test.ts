import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.DEEPSEEK_API_KEY = "test-key-only";

const upstream = vi.hoisted(() => ({ complete: vi.fn() }));
vi.mock("../mikhalych/deepseek-upstream", () => ({
  getMikhalychChatModel: () => "test-model",
  mikhalychChatCompletion: upstream.complete,
}));

import { projectAssistant } from "./ai";
import { confirmPayment } from "./billing";
import { defaultSettings } from "./config";
import { closeCommerceDatabase, database } from "./db";
import { saveServerProject } from "./projects";
import { CommerceError, type CommerceOrder } from "./types";

const paidAt = Date.now() - 60_000;

function documentFor(name = "Керамогранит") {
  return {
    project: { id: "local-ai-project", name: "Смета с приватными данными", documentDate: "2026-09-22" },
    parties: { customer: { name: "Секретный Заказчик", contact: "+7 900 000-00-00" }, contractor: { name: "Закрытый Подрядчик" }, object: "Квартира на Невском", notes: "Не отправлять наружу" },
    materials: [{ key: "tile", name, unit: "м²", quantity: 12, unitPrice: { amount: 1000, currency: "RUB", provenance: "ввёл заказчик" } }],
    works: [{ key: "install", name: "Укладка", unit: "м²", quantity: 12 }],
  };
}

async function setAiSettings(overrides: Partial<ReturnType<typeof defaultSettings>> = {}) {
  const value = {
    ...defaultSettings(), proAiEnabled: true, proAiRequests: 4, proAiBudgetKopecks: 100_000,
    aiInputKopecksPerMillion: 100_000, aiOutputKopecksPerMillion: 100_000,
    aiPriceCheckedAt: new Date().toISOString(), ...overrides,
  };
  await (await database()).query("INSERT INTO commerce_settings(id,value) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1", [JSON.stringify(value)]);
}

async function seedProject(withPro = true) {
  const db = await database();
  const userId = randomUUID(); const orderId = randomUUID();
  await db.query("INSERT INTO commerce_users(id,email,created_at) VALUES($1,$2,$3)", [userId, `${userId}@example.test`, paidAt]);
  if (withPro) {
    const order = (await db.query<CommerceOrder>("INSERT INTO commerce_orders(id,user_id,kind,amount,mode,created_at,settings_revision) VALUES($1,$2,'pro_month',39900,'local',$3,1) RETURNING *", [orderId, userId, paidAt])).rows[0]!;
    await confirmPayment(order.invoice, order.amount, order.id, undefined, paidAt);
  }
  const saved = await saveServerProject(userId, `ai-${userId}`, documentFor());
  return { db, userId, projectId: saved.id };
}

const response = (answer = "Готово", usage?: { prompt_tokens: number; completion_tokens: number }) => ({ ok: true, json: async () => ({ choices: [{ message: { content: answer } }], usage }) });

beforeAll(async () => { await database(); });
beforeEach(() => { upstream.complete.mockReset(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("projectAssistant", () => {
  it("requires active PRO before it calls the upstream model", async () => {
    await setAiSettings();
    const { userId, projectId } = await seedProject(false);
    await expect(projectAssistant(userId, projectId, "Что купить?")).rejects.toMatchObject({ status: 403 } satisfies Partial<CommerceError>);
    expect(upstream.complete).not.toHaveBeenCalled();
  });

  it("reserves the count before an upstream call, preventing concurrent overuse", async () => {
    await setAiSettings({ proAiRequests: 1 });
    const { userId, projectId } = await seedProject();
    let resolve!: (value: ReturnType<typeof response>) => void;
    upstream.complete.mockReturnValue(new Promise((done) => { resolve = done; }));
    const first = projectAssistant(userId, projectId, "Первый вопрос");
    await vi.waitFor(() => expect(upstream.complete).toHaveBeenCalledTimes(1));
    await expect(projectAssistant(userId, projectId, "Второй вопрос")).rejects.toMatchObject({ status: 429 } satisfies Partial<CommerceError>);
    resolve(response());
    await expect(first).resolves.toMatchObject({ remaining: 0 });
  });

  it("rejects a request whose conservative reservation exceeds the money budget", async () => {
    await setAiSettings({ proAiBudgetKopecks: 1 });
    const { userId, projectId } = await seedProject();
    await expect(projectAssistant(userId, projectId, "Проверка бюджета")).rejects.toMatchObject({ status: 429 } satisfies Partial<CommerceError>);
    expect(upstream.complete).not.toHaveBeenCalled();
  });

  it("records measured token cost after a successful completion", async () => {
    await setAiSettings();
    const { db, userId, projectId } = await seedProject();
    upstream.complete.mockResolvedValue(response("Краткий ответ", { prompt_tokens: 10, completion_tokens: 20 }));
    await expect(projectAssistant(userId, projectId, "Что известно?")).resolves.toMatchObject({ answer: "Краткий ответ", remaining: 3 });
    const usage = await db.query<{ state: string; cost: number }>("SELECT state,cost FROM commerce_ai_usage WHERE user_id=$1", [userId]);
    expect(usage.rows).toEqual([{ state: "complete", cost: 3 }]);
  });

  it("keeps the reservation uncertain after an upstream timeout or failure", async () => {
    await setAiSettings();
    const { db, userId, projectId } = await seedProject();
    upstream.complete.mockRejectedValue(new Error("timeout"));
    await expect(projectAssistant(userId, projectId, "Ответьте")).rejects.toMatchObject({ status: 502 } satisfies Partial<CommerceError>);
    const usage = await db.query<{ state: string; reserved: number; cost: number | null }>("SELECT state,reserved,cost FROM commerce_ai_usage WHERE user_id=$1", [userId]);
    expect(usage.rows[0]).toMatchObject({ state: "uncertain", cost: null });
    expect(Number(usage.rows[0]?.reserved)).toBeGreaterThan(0);
  });

  it("sends only material and work context upstream, never private parties or object details", async () => {
    await setAiSettings();
    const { userId, projectId } = await seedProject();
    upstream.complete.mockResolvedValue(response());
    await projectAssistant(userId, projectId, "Поясните смету");
    const request = upstream.complete.mock.calls[0]?.[0] as { messages: { content: string }[] };
    const content = request.messages[1]!.content;
    expect(content).toContain("Керамогранит");
    expect(content).not.toMatch(/Секретный Заказчик|Закрытый Подрядчик|Невском|900 000|Не отправлять|Смета с приватными/);
  });
});
