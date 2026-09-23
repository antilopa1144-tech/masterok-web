import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { freeWeekPeriod, reserveMikhalychAccess } from "./paid-access";
import { defaultSettings, getSettings, validateSettings } from "../commerce/config";
import { closeCommerceDatabase, database } from "../commerce/db";
import { confirmPayment } from "../commerce/billing";
import { requestLogin, verifyLogin } from "../commerce/auth";
import type { CommerceOrder } from "../commerce/types";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.COMMERCE_AUTH_SECRET = "test-commerce-secret-that-is-long-enough";
process.env.DEEPSEEK_API_KEY = "test-key-only";

const request = (cookie = "") => new Request("http://localhost:3460/api/mikhalych", { headers: { "x-forwarded-for": "192.0.2.34", "user-agent": "quota-test", cookie } });

beforeAll(async () => { await database(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("Михалыч: серверный доступ", () => {
  it("keeps a single free period through Sunday and resets on Monday Moscow time", () => {
    const sunday = freeWeekPeriod(Date.parse("2026-09-27T20:59:59Z"));
    const monday = freeWeekPeriod(Date.parse("2026-09-27T21:00:00Z"));
    expect(sunday).toEqual({ period: "2026-09-21", reset: Date.parse("2026-09-27T21:00:00Z") });
    expect(monday).toEqual({ period: "2026-09-28", reset: Date.parse("2026-10-04T21:00:00Z") });
  });
  it("migrates old daily settings and rejects a PRO quota below free usage", async () => {
    const db = await database();
    const legacy = { ...defaultSettings(), freeAiDailyRequests: 5 } as Record<string, unknown>;
    delete legacy.freeAiWeeklyRequests;
    await db.query("INSERT INTO commerce_settings(id,value) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1", [JSON.stringify(legacy)]);
    expect((await getSettings()).freeAiWeeklyRequests).toBe(5);
    expect(() => validateSettings({ ...defaultSettings(), proAiRequests: 20 })).toThrow(/пяти недель/);
  });
  it("counts free use across requests and never accepts a photo for a guest", async () => {
    const db = await database();
    await db.query("INSERT INTO commerce_settings(id,value) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1", [JSON.stringify({ ...defaultSettings(), freeAiWeeklyRequests: 2, proAiEnabled: true, aiInputKopecksPerMillion: 10000, aiOutputKopecksPerMillion: 10000, aiPriceCheckedAt: new Date().toISOString() })]);
    await expect(reserveMikhalychAccess(request(), true)).rejects.toMatchObject({ status: 403 });
    await reserveMikhalychAccess(request(), false);
    await reserveMikhalychAccess(request(), false);
    await expect(reserveMikhalychAccess(request(), false)).rejects.toMatchObject({ status: 429 });
  });
  it("preserves existing free use while PRO AI is unavailable", async () => {
    const db = await database();
    await db.query("UPDATE commerce_settings SET value=$1 WHERE id=1", [JSON.stringify({ ...defaultSettings(), freeAiWeeklyRequests: 0 })]);
    expect(await reserveMikhalychAccess(request(), false)).toBeNull();
  });

  it("recognizes a paid user from the server session, not a client flag", async () => {
    const db = await database();
    const login = await requestLogin(`${randomUUID()}@example.test`, "192.0.2.35");
    const session = await verifyLogin(login.challenge, login.localCode);
    const user = session.user.id;
    const orderId = randomUUID();
    const order = (await db.query<CommerceOrder>("INSERT INTO commerce_orders(id,user_id,kind,amount,mode,created_at,settings_revision) VALUES($1,$2,'pro_month',39900,'local',$3,1) RETURNING *", [orderId, user, Date.now()])).rows[0]!;
    await confirmPayment(order.invoice, order.amount, order.id);
    const settings = { ...defaultSettings(), proAiEnabled: true, proAiRequests: 1, aiInputKopecksPerMillion: 10000, aiOutputKopecksPerMillion: 10000, aiPriceCheckedAt: new Date().toISOString() };
    await db.query("UPDATE commerce_settings SET value=$1 WHERE id=1", [JSON.stringify(settings)]);
    // The stored token is opaque; no email or asserted PRO flag is accepted as authorization.
    await expect(reserveMikhalychAccess(request(`masterok_account=${user}`), true)).rejects.toMatchObject({ status: 403 });
    const reservation = await reserveMikhalychAccess(request(`masterok_account=${session.token}`), true);
    reservation?.recordUsage(10, 20);
    await reservation?.finish();
    const usage = (await db.query<{ state: string; cost: number }>("SELECT state,cost FROM commerce_ai_usage WHERE user_id=$1", [user])).rows[0];
    expect(usage.state).toBe("complete");
    expect(Number(usage.cost)).toBeGreaterThan(0);
    expect(Number(usage.cost)).toBeLessThan(2000);
    await expect(reserveMikhalychAccess(request(`masterok_account=${session.token}`), false)).rejects.toMatchObject({ status: 429 });
  });
});
