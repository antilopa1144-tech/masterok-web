import { randomUUID } from "node:crypto";
import { database, type Sql } from "./db";
import { commerceMode, getSettings, publicState } from "./config";
import { CommerceError, type CommerceOrder, type CommerceUser, type ProductKind } from "./types";
import { buildPaymentUrl, createProviderRefund, queryOperation, queryProviderRefund, requestRecurring } from "./robokassa";
import type { ProjectDocumentInput } from "./document-types";

export function normalizeOrder(order: CommerceOrder): CommerceOrder {
  return { ...order, invoice: String(order.invoice), amount: Number(order.amount), refunded: Number(order.refunded), created_at: Number(order.created_at), paid_at: order.paid_at === null ? null : Number(order.paid_at), access_start: order.access_start === null ? null : Number(order.access_start), access_end: order.access_end === null ? null : Number(order.access_end) };
}

export async function audit(actor: string, action: string, detail: Record<string, unknown>, sql?: Sql): Promise<void> {
  await (sql ?? await database()).query("INSERT INTO commerce_audit VALUES($1,$2,$3,$4,$5)", [randomUUID(), actor, action, JSON.stringify(detail), Date.now()]);
}

export async function funnel(event: string, source: string, detail: Record<string, unknown>, sql?: Sql): Promise<void> {
  await (sql ?? await database()).query("INSERT INTO commerce_funnel VALUES($1,$2,$3,$4,$5,$6)", [randomUUID(), event, source, JSON.stringify(detail), commerceMode(), Date.now()]);
}

export async function accessFor(userId: string, projectId?: string, sql?: Sql, now = Date.now()): Promise<{ pro: boolean; proUntil: number; pack: boolean }> {
  const db = sql ?? await database();
  const orders = (await db.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE user_id=$1 AND mode=$2 AND state IN ('paid','partially_refunded')", [userId, commerceMode()])).rows.map(normalizeOrder);
  const proUntil = orders.filter((o) => o.kind === "pro_month" && (o.access_start ?? Infinity) <= now && (o.access_end ?? 0) > now).reduce((latest, o) => Math.max(latest, o.access_end ?? 0), 0);
  return { pro: proUntil > now, proUntil, pack: Boolean(projectId && orders.some((o) => o.kind === "project_pack" && o.project_id === projectId)) };
}

export async function ownedProject(userId: string, projectId: string, sql?: Sql): Promise<{ id: string; name: string; local_id: string; version: number; payload: unknown }> {
  const row = (await (sql ?? await database()).query<{ id: string; name: string; local_id: string; version: number; payload: unknown }>("SELECT * FROM commerce_projects WHERE id=$1 AND user_id=$2", [projectId, userId])).rows[0];
  if (!row) throw new CommerceError(404, "Проект не найден в вашем аккаунте");
  return row;
}

export async function getOrder(id: string, userId?: string, sql?: Sql): Promise<CommerceOrder> {
  const db = sql ?? await database();
  const row = (await db.query<CommerceOrder>(`SELECT * FROM commerce_orders WHERE id=$1${userId ? " AND user_id=$2" : ""}`, userId ? [id, userId] : [id])).rows[0];
  if (!row || row.mode !== commerceMode()) throw new CommerceError(404, "Заказ не найден");
  return normalizeOrder(row);
}

export async function createOrder(user: CommerceUser, input: { kind: unknown; projectId?: unknown; recurring?: unknown; expectedAmount?: unknown; acceptedOffer?: unknown }): Promise<{ order: CommerceOrder; paymentUrl: string }> {
  if (input.kind !== "project_pack" && input.kind !== "pro_month") throw new CommerceError(400, "Выберите смету проекта или PRO");
  const kind: ProductKind = input.kind;
  const projectId = typeof input.projectId === "string" ? input.projectId : null;
  const order = await (await database()).transaction(async (tx) => {
    const settings = await getSettings(tx);
    const state = publicState(settings);
    if (!state.checkoutAvailable || (kind === "pro_month" && !state.proAvailable)) throw new CommerceError(503, "Оплата пока не подключена. Бесплатные расчёты и корзина доступны.");
    if (input.acceptedOffer !== settings.offerVersion) throw new CommerceError(400, "Ознакомьтесь с условиями покупки");
    const recurring = input.recurring === true;
    if (recurring && (kind !== "pro_month" || !state.recurringAvailable)) throw new CommerceError(400, "Автопродление не подключено. Можно оплатить один месяц.");
    if (kind === "project_pack") {
      if (!projectId) throw new CommerceError(400, "Сначала сохраните выбранный проект");
      const project = await ownedProject(user.id, projectId, tx);
      const document = project.payload as ProjectDocumentInput;
      if (![...document.materials, ...(document.works ?? [])].some((line) => line.unitPrice !== undefined)) {
        throw new CommerceError(400, "Сначала укажите цену хотя бы одного материала или работы. Закупочный список остаётся бесплатным.");
      }
      const access = await accessFor(user.id, projectId, tx);
      if (access.pack || access.pro) throw new CommerceError(409, "Документы этого проекта уже доступны");
    }
    const amount = kind === "project_pack" ? settings.packPriceKopecks : settings.proPriceKopecks;
    if (input.expectedAmount !== amount) throw new CommerceError(409, "Цена изменилась. Обновите предложение перед оплатой.");
    const existing = (await tx.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE user_id=$1 AND kind=$2 AND project_id IS NOT DISTINCT FROM $3 AND state='pending' AND amount=$4 AND recurring_consent=$5 AND mode=$6 AND created_at>$7 ORDER BY created_at DESC LIMIT 1", [user.id, kind, kind === "project_pack" ? projectId : null, amount, recurring, commerceMode(), Date.now() - 30 * 60000])).rows[0];
    if (existing) return normalizeOrder(existing);
    const id = randomUUID();
    const row = (await tx.query<CommerceOrder>("INSERT INTO commerce_orders(id,user_id,project_id,kind,amount,mode,created_at,recurring_consent,settings_revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *", [id, user.id, kind === "project_pack" ? projectId : null, kind, amount, commerceMode(), Date.now(), recurring, settings.revision])).rows[0];
    await audit(user.id, "checkout_created", { orderId: id, offerVersion: settings.offerVersion, amount, recurring }, tx);
    await funnel("checkout_created", "server", { product: kind, amount }, tx);
    return normalizeOrder(row);
  });
  return { order, paymentUrl: buildPaymentUrl(order, user.email) };
}

export function nextCalendarMonth(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

export async function confirmPayment(invoice: string, amount: number, expectedOrderId?: string, operation?: string, now = Date.now()): Promise<CommerceOrder> {
  return (await database()).transaction(async (tx) => {
    const raw = (await tx.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE invoice=$1", [invoice])).rows[0];
    if (!raw) throw new CommerceError(404, "Заказ не найден");
    const order = normalizeOrder(raw);
    if (order.mode !== commerceMode() || order.amount !== amount || (expectedOrderId && expectedOrderId !== order.id)) throw new CommerceError(409, "Платёж не соответствует заказу");
    if (operation) await tx.query("UPDATE commerce_orders SET provider_operation=$1 WHERE id=$2 AND (provider_operation IS NULL OR provider_operation=$1)", [operation, order.id]);
    // Never reactivate a refunded entitlement on a duplicate or late success callback.
    if (order.paid_at !== null) return getOrder(order.id, undefined, tx);
    let start: number | null = null; let end: number | null = null;
    if (order.kind === "pro_month") {
      const active = (await tx.query<{ until: string | null }>("SELECT MAX(access_end) AS until FROM commerce_orders WHERE user_id=$1 AND mode=$2 AND kind='pro_month' AND state IN ('paid','partially_refunded')", [order.user_id, order.mode])).rows[0];
      start = Math.max(now, Number(active?.until ?? 0));
      end = nextCalendarMonth(start);
      const sub = (await tx.query<{ next_order_id: string | null; canceled_at: string | null }>("SELECT * FROM commerce_subscriptions WHERE user_id=$1", [order.user_id])).rows[0];
      if (sub?.next_order_id === order.id) {
        await tx.query("UPDATE commerce_subscriptions SET next_order_id=NULL WHERE user_id=$1", [order.user_id]);
      } else {
        const canceledAfterPurchase = Number(sub?.canceled_at ?? 0) > order.created_at;
        const consent = order.recurring_consent && !canceledAfterPurchase;
        await tx.query("INSERT INTO commerce_subscriptions(user_id,reference_invoice,auto_renew,consent_version,consent_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET reference_invoice=$2,auto_renew=$3,consent_version=$4,consent_at=$5,next_order_id=NULL", [order.user_id, invoice, consent, `settings-${order.settings_revision}`, order.created_at]);
      }
    }
    await tx.query("UPDATE commerce_orders SET state='paid',paid_at=$1,access_start=$2,access_end=$3 WHERE id=$4", [now, start, end, order.id]);
    await tx.query("INSERT INTO commerce_payment_events VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [`paid:${invoice}`, order.id, "paid", amount, now]);
    await funnel("purchase_confirmed", "payment_provider", { product: order.kind, amount }, tx);
    return getOrder(order.id, undefined, tx);
  });
}

export async function cancelRenewal(userId: string): Promise<void> {
  await (await database()).transaction(async (tx) => {
    await tx.query("INSERT INTO commerce_subscriptions(user_id,auto_renew,canceled_at) VALUES($1,false,$2) ON CONFLICT(user_id) DO UPDATE SET auto_renew=false,canceled_at=$2", [userId, Date.now()]);
    await audit(userId, "recurring_consent_revoked", {}, tx);
    await funnel("subscription_canceled", "server", {}, tx);
  });
}

export async function confirmRefund(refundId: string, amount: number): Promise<void> {
  await (await database()).transaction(async (tx) => {
    const refund = (await tx.query<{ id: string; order_id: string; amount: number; state: string }>("SELECT * FROM commerce_refunds WHERE id=$1", [refundId])).rows[0];
    if (!refund || Number(refund.amount) !== amount) throw new CommerceError(409, "Возврат не соответствует заявке");
    if (refund.state === "finished") return;
    const order = await getOrder(refund.order_id, undefined, tx);
    if (order.paid_at === null || order.refunded + amount > order.amount) throw new CommerceError(409, "Возвращаемая сумма превышает оплату");
    const refunded = order.refunded + amount;
    let end = order.access_end;
    // Partial PRO refund shortens only this prepaid period proportionally to remaining money.
    if (order.kind === "pro_month" && order.access_start !== null) end = order.access_start + Math.floor((nextCalendarMonth(order.access_start) - order.access_start) * (order.amount - refunded) / order.amount);
    await tx.query("UPDATE commerce_orders SET refunded=$1,state=$2,access_end=$3 WHERE id=$4", [refunded, refunded === order.amount ? "refunded" : "partially_refunded", end, order.id]);
    await tx.query("UPDATE commerce_refunds SET state='finished' WHERE id=$1", [refund.id]);
    await tx.query("INSERT INTO commerce_payment_events VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [`refund:${refund.id}`, order.id, "refund", amount, Date.now()]);
    if (order.kind === "pro_month") await tx.query("UPDATE commerce_subscriptions SET auto_renew=false,canceled_at=$1 WHERE user_id=$2", [Date.now(), order.user_id]);
    await funnel("refund_confirmed", "payment_provider", { product: order.kind, amount }, tx);
  });
}

export async function startRefund(actor: string, orderId: string, amount: number, key: string): Promise<{ refundId: string; state: string }> {
  if (!/^[\da-f-]{36}$/i.test(key) || !Number.isInteger(amount) || amount <= 0) throw new CommerceError(400, "Укажите корректную сумму и идентификатор возврата");
  const db = await database();
  const request = await db.transaction(async (tx) => {
    const existing = (await tx.query<{ id: string; state: string; order_id: string; amount: number }>("SELECT * FROM commerce_refunds WHERE id=$1", [key])).rows[0];
    if (existing) {
      if (existing.order_id !== orderId || Number(existing.amount) !== amount) throw new CommerceError(409, "Этот идентификатор уже использован для другого возврата");
      return { existing: true, state: existing.state, order: await getOrder(orderId, undefined, tx) };
    }
    const order = await getOrder(orderId, undefined, tx);
    const pending = (await tx.query("SELECT id FROM commerce_refunds WHERE order_id=$1 AND state NOT IN ('finished','canceled')", [orderId])).rows;
    if (pending.length) throw new CommerceError(409, "По этой оплате уже есть незавершённый возврат. Сначала проверьте его статус.");
    if (order.paid_at === null || amount > order.amount - order.refunded) throw new CommerceError(400, "Сумма больше доступного остатка оплаты");
    if (order.mode !== "local" && (!order.provider_operation || !process.env.ROBOKASSA_PASSWORD3)) throw new CommerceError(503, "Для возврата нужны OpKey операции и пароль API возвратов. Выполните сверку платежа.");
    await tx.query("INSERT INTO commerce_refunds(id,order_id,amount,state,created_at) VALUES($1,$2,$3,'submitting',$4)", [key, orderId, amount, Date.now()]);
    await audit(actor, "refund_requested", { orderId, refundId: key, amount }, tx);
    return { existing: false, state: "submitting", order };
  });
  if (request.existing) return { refundId: key, state: request.state };
  if (request.order.mode === "local") { await confirmRefund(key, amount); return { refundId: key, state: "finished" }; }
  try {
    const providerId = await createProviderRefund(request.order.provider_operation!, amount, request.order.kind, request.order.refunded === 0 && amount === request.order.amount);
    await db.query("UPDATE commerce_refunds SET state='processing',provider_request=$1 WHERE id=$2", [providerId, key]);
    return { refundId: key, state: "processing" };
  } catch (error) {
    await db.query("UPDATE commerce_refunds SET state='unknown' WHERE id=$1", [key]);
    throw error;
  }
}

export async function checkRefund(refundId: string): Promise<{ state: string }> {
  const row = (await (await database()).query<{ state: string; provider_request: string | null; amount: number }>("SELECT * FROM commerce_refunds WHERE id=$1", [refundId])).rows[0];
  if (!row) throw new CommerceError(404, "Возврат не найден");
  if (row.state === "finished" || row.state === "canceled") return { state: row.state };
  if (!row.provider_request) throw new CommerceError(409, "Ответ сервиса не получен. Нужна сверка заявки в кабинете Robokassa; повторно списывать сумму возврата нельзя.");
  const response = await queryProviderRefund(row.provider_request);
  if (response.finished) { await confirmRefund(refundId, response.amount ?? -1); return { state: "finished" }; }
  if (response.canceled) { await (await database()).query("UPDATE commerce_refunds SET state='canceled' WHERE id=$1", [refundId]); return { state: "canceled" }; }
  return { state: "processing" };
}

export async function reconcileOrder(id: string): Promise<CommerceOrder> {
  const order = await getOrder(id);
  const state = await queryOperation(order.invoice);
  if (state.state === 100) {
    if (state.amount !== order.amount || state.orderId !== order.id || !state.operation) throw new CommerceError(409, "Реквизиты оплаченной операции не совпадают с заказом. Нужна ручная сверка Robokassa.");
    return confirmPayment(order.invoice, state.amount, order.id, state.operation);
  }
  if ([10, 60].includes(state.state) && order.paid_at === null) await (await database()).query("UPDATE commerce_orders SET state='canceled' WHERE id=$1 AND paid_at IS NULL", [order.id]);
  return getOrder(id);
}

export async function runRenewals(now = Date.now()): Promise<{ created: number }> {
  const db = await database();
  let created = 0;
  // Low-volume single worker; financial lock serialises cancellation and charge initiation.
  const subscribers = (await db.query<{ user_id: string }>("SELECT user_id FROM commerce_subscriptions WHERE auto_renew=true AND next_order_id IS NULL LIMIT 100")).rows;
  for (const subscriber of subscribers) {
    const localOrder = await db.transaction(async (tx) => {
      const settings = await getSettings(tx);
      if (!publicState(settings).recurringAvailable) return null;
      const sub = (await tx.query<{ reference_invoice: string; auto_renew: boolean; next_order_id: string | null }>("SELECT * FROM commerce_subscriptions WHERE user_id=$1", [subscriber.user_id])).rows[0];
      if (!sub?.auto_renew || sub.next_order_id) return null;
      const reference = (await tx.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE invoice=$1 AND mode=$2", [sub.reference_invoice, commerceMode()])).rows[0];
      if (!reference) return null;
      if (reference.amount !== settings.proPriceKopecks) {
        await tx.query("UPDATE commerce_subscriptions SET auto_renew=false WHERE user_id=$1", [subscriber.user_id]);
        await audit("scheduler", "renewal_stopped_price_changed", { userId: subscriber.user_id }, tx);
        return null;
      }
      const until = Number((await tx.query<{ until: string | null }>("SELECT MAX(access_end) AS until FROM commerce_orders WHERE user_id=$1 AND kind='pro_month' AND state IN ('paid','partially_refunded') AND mode=$2", [subscriber.user_id, commerceMode()])).rows[0]?.until ?? 0);
      if (!until || until > now || until < now - 7 * 86400000) return null;
      const id = randomUUID();
      const order = normalizeOrder((await tx.query<CommerceOrder>("INSERT INTO commerce_orders(id,user_id,kind,amount,mode,created_at,settings_revision) VALUES($1,$2,'pro_month',$3,$4,$5,$6) RETURNING *", [id, subscriber.user_id, settings.proPriceKopecks, commerceMode(), now, settings.revision])).rows[0]);
      await tx.query("UPDATE commerce_subscriptions SET next_order_id=$1 WHERE user_id=$2", [id, subscriber.user_id]);
      await audit("scheduler", "renewal_initiated", { orderId: id }, tx);
      if (order.mode !== "local") {
        try { await requestRecurring(order, String(sub.reference_invoice)); }
        catch { await audit("scheduler", "renewal_requires_reconciliation", { orderId: id }, tx); }
      }
      created++;
      return order.mode === "local" ? order : null;
    });
    if (localOrder) await confirmPayment(localOrder.invoice, localOrder.amount, localOrder.id, undefined, now);
  }
  return { created };
}
