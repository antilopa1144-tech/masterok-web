import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";

import { accessFor, cancelRenewal, confirmPayment, nextCalendarMonth, runRenewals, startRefund } from "./billing";
import { defaultSettings } from "./config";
import { closeCommerceDatabase, database } from "./db";
import { CommerceError, type CommerceOrder } from "./types";

const now = Date.UTC(2026, 0, 31, 12);

async function seedOrder(kind: "project_pack" | "pro_month" = "pro_month", amount = 39900) {
  const db = await database();
  const userId = randomUUID(); const orderId = randomUUID();
  await db.query("INSERT INTO commerce_users(id,email,created_at) VALUES($1,$2,$3)", [userId, `${userId}@example.test`, now]);
  const order = (await db.query<CommerceOrder>("INSERT INTO commerce_orders(id,user_id,kind,amount,mode,created_at,settings_revision,recurring_consent) VALUES($1,$2,$3,$4,'local',$5,1,true) RETURNING *", [orderId, userId, kind, amount, now])).rows[0]!;
  return { db, userId, orderId, order };
}

async function recurringSettings(overrides: Partial<ReturnType<typeof defaultSettings>> = {}) {
  const settings = { ...defaultSettings(), checkoutEnabled: true, proEnabled: true, recurringEnabled: true, ...overrides };
  await (await database()).query("INSERT INTO commerce_settings(id,value) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1", [JSON.stringify(settings)]);
}

beforeAll(async () => { await database(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("billing monetary invariants", () => {
  it("rejects a callback whose amount does not match the server order", async () => {
    const { order } = await seedOrder();
    await expect(confirmPayment(String(order.invoice), Number(order.amount) + 1, order.id, undefined, now)).rejects.toMatchObject({ status: 409 } satisfies Partial<CommerceError>);
  });

  it("is idempotent for concurrent duplicate payment callbacks and grants one month once", async () => {
    const { db, userId, order } = await seedOrder();
    const [first, second] = await Promise.all([
      confirmPayment(String(order.invoice), Number(order.amount), order.id, "operation-1", now),
      confirmPayment(String(order.invoice), Number(order.amount), order.id, "operation-1", now),
    ]);
    expect(first.state).toBe("paid"); expect(second.state).toBe("paid");
    const events = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM commerce_payment_events WHERE order_id=$1", [order.id]);
    expect(Number(events.rows[0]!.count)).toBe(1);
    const access = await accessFor(userId, undefined, undefined, now + 1);
    expect(access.proUntil).toBe(nextCalendarMonth(now));
  });

  it("does not resurrect access after a full local refund and makes refund requests idempotent", async () => {
    const { userId, order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    const key = randomUUID();
    expect(await startRefund("admin", order.id, Number(order.amount), key)).toMatchObject({ refundId: key, state: "finished" });
    expect(await startRefund("admin", order.id, Number(order.amount), key)).toMatchObject({ refundId: key, state: "finished" });
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now + 1);
    expect((await accessFor(userId, undefined, undefined, now + 2)).pro).toBe(false);
  });

  it("rejects refund amounts above the paid remainder", async () => {
    const { order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    await expect(startRefund("admin", order.id, Number(order.amount) + 1, randomUUID())).rejects.toMatchObject({ status: 400 } satisfies Partial<CommerceError>);
  });

  it("cancels renewal safely even when called repeatedly", async () => {
    const { db, userId } = await seedOrder();
    await cancelRenewal(userId); await cancelRenewal(userId);
    const sub = await db.query<{ auto_renew: boolean; canceled_at: string }>("SELECT auto_renew,canceled_at FROM commerce_subscriptions WHERE user_id=$1", [userId]);
    expect(sub.rows[0]).toMatchObject({ auto_renew: false });
  });

  it("uses the last valid day when adding a calendar month", () => {
    expect(new Date(nextCalendarMonth(now)).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("creates exactly one local renewal when the job is repeated", async () => {
    await recurringSettings();
    const db = await database();
    await db.query("UPDATE commerce_subscriptions SET auto_renew=false");
    const { userId, order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    const renewalAt = nextCalendarMonth(now) + 1;
    await expect(runRenewals(renewalAt)).resolves.toEqual({ created: 1 });
    await expect(runRenewals(renewalAt)).resolves.toEqual({ created: 0 });
    const orders = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM commerce_orders WHERE user_id=$1", [userId]);
    expect(Number(orders.rows[0]!.count)).toBe(2);
  });

  it("does not create a renewal after the owner cancels it", async () => {
    await recurringSettings();
    const db = await database();
    await db.query("UPDATE commerce_subscriptions SET auto_renew=false");
    const { userId, order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    await cancelRenewal(userId);
    await expect(runRenewals(nextCalendarMonth(now) + 1)).resolves.toEqual({ created: 0 });
    const orders = await db.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM commerce_orders WHERE user_id=$1", [userId]);
    expect(Number(orders.rows[0]!.count)).toBe(1);
  });

  it("turns off renewal when the current PRO price no longer matches consent", async () => {
    await recurringSettings({ proPriceKopecks: 49900 });
    const db = await database();
    await db.query("UPDATE commerce_subscriptions SET auto_renew=false");
    const { userId, order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    await expect(runRenewals(nextCalendarMonth(now) + 1)).resolves.toEqual({ created: 0 });
    const sub = await db.query<{ auto_renew: boolean }>("SELECT auto_renew FROM commerce_subscriptions WHERE user_id=$1", [userId]);
    expect(sub.rows[0]?.auto_renew).toBe(false);
  });

  it("shortens a partially refunded month, then removes the remaining access on full refund", async () => {
    const { db, userId, order } = await seedOrder();
    await confirmPayment(String(order.invoice), Number(order.amount), order.id, undefined, now);
    const before = await accessFor(userId, undefined, undefined, now + 1);
    await startRefund("admin", order.id, 10_000, randomUUID());
    const partial = await accessFor(userId, undefined, undefined, now + 1);
    expect(partial.proUntil).toBeLessThan(before.proUntil!);
    await startRefund("admin", order.id, Number(order.amount) - 10_000, randomUUID());
    expect((await accessFor(userId, undefined, undefined, now + 2)).pro).toBe(false);
    const state = await db.query<{ state: string; refunded: number }>("SELECT state,refunded FROM commerce_orders WHERE id=$1", [order.id]);
    expect(state.rows[0]).toMatchObject({ state: "refunded", refunded: Number(order.amount) });
  });
});
