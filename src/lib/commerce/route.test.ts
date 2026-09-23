import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.COMMERCE_ADMIN_EMAILS = "owner@masterok.test";

import { GET, POST } from "@/app/api/commerce/[...path]/route";
import { requestLogin, verifyLogin } from "./auth";
import { closeCommerceDatabase, database } from "./db";
import { resultSignature } from "./robokassa";
import { getSettings } from "./config";

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });
const origin = "http://localhost:3460";
const request = (path: string[], body?: unknown, cookie?: string, originHeader = origin) => new Request(`${origin}/api/commerce/${path.join("/")}`, {
  method: body === undefined ? "GET" : "POST",
  headers: { ...(body === undefined ? {} : { "content-type": "application/json", origin: originHeader }), ...(cookie ? { cookie } : {}) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const doc = { project: { id: "local", name: "Проект", documentDate: "2026-09-22" }, materials: [
  { key: "paint", name: "Краска", unit: "л", quantity: 5, unitPrice: { amount: 400, currency: "RUB", provenance: "тестовая цена" } },
  { key: "primer", name: "Грунтовка", unit: "л", quantity: 2 },
] };

async function cookie(email: string): Promise<string> {
  const login = await requestLogin(email, "127.0.0.1");
  const result = await verifyLogin(login.challenge, login.localCode!);
  return `masterok_account=${result.token}`;
}

beforeAll(async () => { await database(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("commerce catch-all route", () => {
  it("keeps config/me public and inert when commerce is off", async () => {
    process.env.MONETIZATION_MODE = "off";
    const config = await GET(request(["config"]), context(["config"]));
    const me = await GET(request(["me"]), context(["me"]));
    const health = await GET(request(["health"]), context(["health"]));
    expect(config.status).toBe(200); expect((await config.json()).mode).toBe("off");
    expect((await me.json()).user).toBeNull();
    expect(health.status).toBe(200); expect(await health.json()).toEqual({ database: "ok" });
    process.env.MONETIZATION_MODE = "local";
  });

  it("rejects wrong-origin and unauthenticated project writes", async () => {
    const wrongOrigin = await POST(request(["projects"], { localId: "a", document: doc }, undefined, "https://evil.example"), context(["projects"]));
    const anonymous = await POST(request(["projects"], { localId: "a", document: doc }), context(["projects"]));
    expect(wrongOrigin.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });

  it("enforces project ownership and settings revision for a signed-in user", async () => {
    const ownerCookie = await cookie("owner@masterok.test");
    const otherCookie = await cookie("other@masterok.test");
    const aiDisabled = await POST(request(["ai"], { projectId: "missing", message: "Проверь смету" }, ownerCookie), context(["ai"]));
    expect(aiDisabled.status).toBe(503);
    const saved = await POST(request(["projects"], { localId: "kitchen", document: doc }, ownerCookie), context(["projects"]));
    expect(saved.status).toBe(200);
    const projectId = (await saved.json()).id as string;
    const foreign = await GET(request(["projects", projectId], undefined, otherCookie), context(["projects", projectId]));
    expect(foreign.status).toBe(404);
    const settings = await getSettings();
    const first = await POST(request(["admin", "settings"], settings, ownerCookie), context(["admin", "settings"]));
    const stale = await POST(request(["admin", "settings"], settings, ownerCookie), context(["admin", "settings"]));
    expect(first.status).toBe(200); expect(stale.status).toBe(409);
  });
  it("checks the whole HTTP pack purchase, signed replay, export and refund boundary", async () => {
    const ownerCookie = await cookie("flow@masterok.test");
    const adminCookie = await cookie("owner@masterok.test");
    const saved = await POST(request(["projects"], {localId:"flow", document:doc}, ownerCookie), context(["projects"]));
    const projectId = (await saved.json()).id;
    const exportRequest = () => POST(request(["documents"], {projectId,format:"pdf"}, ownerCookie), context(["documents"]));
    expect((await exportRequest()).status).toBe(403);
    const settings = await getSettings();
    const created = await POST(request(["orders"], {kind:"project_pack",projectId,expectedAmount:settings.packPriceKopecks,acceptedOffer:settings.offerVersion}, ownerCookie), context(["orders"]));
    expect(created.status).toBe(200);
    const {order} = await created.json();
    const pending = await GET(request(["orders", order.id], undefined, ownerCookie), context(["orders", order.id]));
    expect((await pending.json()).project).toMatchObject({ name: "Проект", materialCount: 2, workCount: 0, knownTotal: 2000, unpricedCount: 1, layoutCount: 0 });
    const amount = (order.amount/100).toFixed(2);
    const body = new URLSearchParams({OutSum:amount,InvId:String(order.invoice),Shp_order:order.id,SignatureValue:resultSignature(amount,String(order.invoice),order.id)});
    const notify = () => POST(new Request(`${origin}/api/commerce/payment/result`, {method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body}), context(["payment","result"]));
    expect(await (await notify()).text()).toBe(`OK${order.invoice}`);
    expect(await (await notify()).text()).toBe(`OK${order.invoice}`);
    const exported = await exportRequest();
    expect(exported.status).toBe(200);
    expect(new TextDecoder().decode((await exported.arrayBuffer()).slice(0,4))).toBe("%PDF");
    const documentId = exported.headers.get("x-document-id")!;
    const stranger = await GET(request(["documents",documentId]), context(["documents",documentId]));
    expect(stranger.status).toBe(401);
    const refundBody = {orderId:order.id,amountKopecks:order.amount,idempotencyKey:randomUUID()};
    expect((await POST(request(["admin","refund"],refundBody,adminCookie), context(["admin","refund"]))).status).toBe(200);
    expect((await POST(request(["admin","refund"],refundBody,adminCookie), context(["admin","refund"]))).status).toBe(200);
    expect((await exportRequest()).status).toBe(403);
    expect((await GET(request(["documents",documentId],undefined,ownerCookie),context(["documents",documentId]))).status).toBe(404);
  }, 20000);

  it("does not sell a client estimate with no entered prices", async () => {
    const ownerCookie = await cookie("empty-prices@masterok.test");
    const saved = await POST(request(["projects"], { localId: "empty-prices", document: { ...doc, materials: [{ key: "paint", name: "Краска", unit: "л", quantity: 5 }] } }, ownerCookie), context(["projects"]));
    const projectId = (await saved.json()).id;
    const settings = await getSettings();
    const created = await POST(request(["orders"], { kind: "project_pack", projectId, expectedAmount: settings.packPriceKopecks, acceptedOffer: settings.offerVersion }, ownerCookie), context(["orders"]));
    expect(created.status).toBe(400);
    expect((await created.json()).error).toMatch(/укажите цену/i);
  });

});
