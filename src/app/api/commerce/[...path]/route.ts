import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/commerce/db";
import { commerceMode, getSettings, publicState, validateSettings } from "@/lib/commerce/config";
import { assertSameOrigin, currentUser, logout, readJson, requestLogin, requireUser, SESSION_COOKIE, verifyLogin } from "@/lib/commerce/auth";
import { accessFor, audit, cancelRenewal, checkRefund, confirmPayment, createOrder, funnel, getOrder, normalizeOrder, ownedProject, reconcileOrder, runRenewals, startRefund } from "@/lib/commerce/billing";
import { buildPaymentUrl, verifyResult, verifyResult2 } from "@/lib/commerce/robokassa";
import { compareProjectDocuments, createDocument, downloadDocument, projectVersions, saveServerProject, saveTemplate, serverProject, templates } from "@/lib/commerce/projects";
import { CommerceError, type CommerceOrder } from "@/lib/commerce/types";
import type { ProjectDocumentInput } from "@/lib/commerce/document-types";
import { buildDocumentTotals } from "@/lib/commerce/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
const str = (value: unknown) => typeof value === "string" ? value : "";
function binary(doc: { bytes: Uint8Array; format: string; id: string }) {
  return new Response(Buffer.from(doc.bytes), { headers: { "Content-Type": doc.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="masterok-project.${doc.format}"`, "X-Document-Id": doc.id, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
async function boundedText(request: Request): Promise<string> {
  const reader = request.body?.getReader(); if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.length; if (size > 32000) { await reader.cancel(); throw new CommerceError(413, "Уведомление слишком большое"); } chunks.push(chunk.value); }
  return Buffer.concat(chunks).toString("utf8");
}
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = (await context.params).path; const route = path.join("/"); const method = request.method;
    const mode = commerceMode(); const settings = await getSettings(); const state = publicState(settings);
    if (method === "GET" && route === "config") return json(state);
    if (method === "GET" && route === "offers") {
      const calculator = new URL(request.url).searchParams.get("calculator");
      const offers = mode !== "off" && settings.offersEnabled ? settings.offers.filter((o) => o.enabled && Date.parse(o.expiresAt) > Date.now() && calculator && o.calculatorSlugs.includes(calculator)).map(({ contractReference: _contract, url: _url, ...offer }) => offer) : [];
      return json({ offers });
    }
    if (method === "GET" && route === "me" && mode === "off") return json({ user: null, state, access: { pro: false, proUntil: 0, pack: false }, subscription: null, projects: [], orders: [], documents: [] });
    if (mode === "off") throw new CommerceError(503, "Покупки и кабинет пока не подключены. Бесплатные расчёты и локальные проекты работают.");
    if (route === "payment/result") {
      const params = method === "GET" ? new URL(request.url).searchParams : new URLSearchParams(await boundedText(request));
      const result = verifyResult(params); await confirmPayment(result.invoice, result.amount, result.orderId);
      return new Response(`OK${result.invoice}`, { headers: { "Cache-Control": "no-store" } });
    }
    if (route === "payment/result2" && method === "POST") {
      const result = verifyResult2(await boundedText(request));
      if (result.state === "OK") await confirmPayment(result.invoice, result.amount, undefined, result.operation);
      return new Response(`OK${result.invoice}`, { headers: { "Cache-Control": "no-store" } });
    }
    if (route === "payment/return") return NextResponse.redirect(new URL("/kabinet/?payment=returned", process.env.COMMERCE_ORIGIN ?? "https://getmasterok.ru"), 303);
    if (route === "jobs" && method === "POST") {
      const supplied = request.headers.get("authorization") ?? ""; const secret = process.env.COMMERCE_JOB_SECRET;
      const expected = `Bearer ${secret}`;
      if (!secret || secret.length < 24 || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new CommerceError(403, "Нет доступа");
      const renewals = await runRenewals(); let reconciled = 0;
      if (mode === "live") {
        const pending = (await (await database()).query<{ id: string }>("SELECT id FROM commerce_orders WHERE state='pending' AND mode=$1 ORDER BY created_at LIMIT 20", [mode])).rows;
        for (const order of pending) { try { await reconcileOrder(order.id); reconciled++; } catch { /* Next job retries read-only reconciliation. */ } }
        const refunds = (await (await database()).query<{ id: string }>("SELECT r.id FROM commerce_refunds r JOIN commerce_orders o ON o.id=r.order_id WHERE r.state='processing' AND o.mode=$1 LIMIT 20", [mode])).rows;
        for (const refund of refunds) { try { await checkRefund(refund.id); } catch { /* No duplicate refund creation. */ } }
      }
      return json({ ...renewals, reconciled });
    }
    if (method === "POST") assertSameOrigin(request);
    if (route === "auth/request" && method === "POST") {
      const body = await readJson(request);
      return json(await requestLogin(body.email, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"));
    }
    if (route === "auth/verify" && method === "POST") {
      const body = await readJson(request); const result = await verifyLogin(body.challenge, body.code); const response = json({ user: result.user });
      response.cookies.set(SESSION_COOKIE, result.token, { httpOnly: true, sameSite: "lax", secure: mode !== "local", path: "/", maxAge: 30 * 86400 }); return response;
    }
    if (route === "auth/logout" && method === "POST") { await logout(request); const response = json({ ok: true }); response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 }); return response; }
    if (route === "me" && method === "GET") {
      const user = await currentUser(request);
      if (!user) return json({ user: null, state, access: { pro: false, proUntil: 0, pack: false }, subscription: null, projects: [], orders: [], documents: [] });
      const db = await database();
      const [access, subscription, projects, orders, documents] = await Promise.all([accessFor(user.id), db.query("SELECT auto_renew FROM commerce_subscriptions WHERE user_id=$1", [user.id]), db.query("SELECT id,name,local_id,version,updated_at FROM commerce_projects WHERE user_id=$1 ORDER BY updated_at DESC", [user.id]), db.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE user_id=$1 AND mode=$2 ORDER BY created_at DESC LIMIT 100", [user.id, mode]), db.query("SELECT d.id,d.project_id,d.format,d.created_at,p.name FROM commerce_documents d JOIN commerce_projects p ON p.id=d.project_id JOIN commerce_orders o ON o.id=d.grant_order_id WHERE d.user_id=$1 AND o.mode=$2 AND o.state IN ('paid','partially_refunded') ORDER BY d.created_at DESC LIMIT 100", [user.id, mode])]);
      return json({ user, state, access, subscription: subscription.rows[0] ?? null, projects: projects.rows, orders: orders.rows.map(normalizeOrder), documents: documents.rows });
    }
    if (path[0] === "go" && method === "GET") {
      const calculator = new URL(request.url).searchParams.get("calculator") ?? "";
      const offer = settings.offersEnabled && settings.offers.find((o) => o.id === path[1] && o.enabled && Date.parse(o.expiresAt) > Date.now() && o.calculatorSlugs.includes(calculator));
      if (!offer) throw new CommerceError(404, "Предложение больше не доступно");
      await funnel("affiliate_click", "redirect", { offerId: offer.id, calculator }); return NextResponse.redirect(offer.url, 302);
    }
    const user = await requireUser(request, path[0] === "admin");
    const body = method === "POST" ? await readJson(request) : {};
    if (route === "projects" && method === "POST") return json(await saveServerProject(user.id, body.localId, body.document, body.expectedVersion));
    if (path[0] === "projects" && path[1]) {
      if (path.length === 2 && method === "GET") return json(await serverProject(user.id, path[1]));
      if (path[2] === "versions" && method === "GET") return json({ versions: await projectVersions(user.id, path[1]) });
      if (path[2] === "compare" && method === "POST") {
        const versions = await projectVersions(user.id, path[1]); const before = versions.find((v) => v.id === body.beforeId); const after = versions.find((v) => v.id === body.afterId);
        if (!before || !after) throw new CommerceError(404, "Версия не найдена"); return json(compareProjectDocuments(before.payload as ProjectDocumentInput, after.payload as ProjectDocumentInput));
      }
    }
    if (route === "templates" && method === "GET") return json({ templates: await templates(user.id) });
    if (route === "templates" && method === "POST") { await saveTemplate(user.id, str(body.projectId), body.name); return json({ ok: true }); }
    if (route === "documents" && method === "POST") return binary(await createDocument(user.id, str(body.projectId), str(body.format), body.branded === true));
    if (path[0] === "documents" && path.length === 2 && method === "GET") return binary(await downloadDocument(user.id, path[1]));
    if (route === "orders" && method === "POST") return json(await createOrder(user, { ...body, kind: body.kind }));
    if (path[0] === "orders" && path.length === 2 && method === "GET") {
      const order = await getOrder(path[1], user.id); const project = order.project_id ? await ownedProject(user.id, order.project_id) : undefined;
      const document = project?.payload as ProjectDocumentInput | undefined;
      const unpricedCount = document ? [...document.materials, ...(document.works ?? [])].filter((line) => !line.unitPrice).length : 0;
      return json({ order, paymentUrl: order.state === "pending" ? buildPaymentUrl(order, user.email) : "", project: project ? { id: project.id, local_id: project.local_id, name: project.name, materialCount: document?.materials.length ?? 0, workCount: document?.works?.length ?? 0, knownTotal: document ? buildDocumentTotals(document).knownGrandTotal : 0, unpricedCount, layoutCount: document?.layouts?.length ?? 0 } : undefined, state });
    }
    if (route === "local/pay" && method === "POST") {
      if (mode !== "local") throw new CommerceError(404, "Локальный симулятор недоступен"); const order = await getOrder(str(body.orderId), user.id);
      if (body.outcome === "success") return json({ order: await confirmPayment(order.invoice, order.amount, order.id, `local-${order.id}`) });
      if (body.outcome !== "cancel") throw new CommerceError(400, "Неизвестный результат");
      await (await database()).query("UPDATE commerce_orders SET state='canceled' WHERE id=$1 AND state='pending'", [order.id]); return json({ order: await getOrder(order.id, user.id) });
    }
    if (route === "subscription/cancel" && method === "POST") { await cancelRenewal(user.id); return json({ ok: true }); }
    if (route === "ai" && method === "POST") { const { projectAssistant } = await import("@/lib/commerce/ai"); return json(await projectAssistant(user.id, str(body.projectId), body.message)); }
    if (route === "admin" && method === "GET") {
      const db = await database(); const [orders, metrics, sales, financial] = await Promise.all([db.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE mode=$1 ORDER BY created_at DESC LIMIT 100", [mode]), db.query("SELECT event,COUNT(*)::int AS count FROM commerce_funnel WHERE mode=$1 GROUP BY event", [mode]), db.query("SELECT * FROM commerce_affiliate_sales WHERE mode=$1 ORDER BY updated_at DESC LIMIT 100", [mode]), db.query("SELECT COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN amount ELSE 0 END),0)::bigint AS gross,COALESCE(SUM(refunded),0)::bigint AS refunds FROM commerce_orders WHERE mode=$1", [mode])]);
      const gross = Number(financial.rows[0]?.gross ?? 0); const refunds = Number(financial.rows[0]?.refunds ?? 0);
      return json({ settings, orders: orders.rows.map(normalizeOrder), metrics: metrics.rows, affiliateSales: sales.rows, financial: { gross, refunds, net: gross - refunds }, mode });
    }
    if (route === "admin/settings" && method === "POST") {
      const next = validateSettings(body); await (await database()).transaction(async (tx) => { const previous = await getSettings(tx); if (next.revision !== previous.revision) throw new CommerceError(409, "Настройки уже изменены. Перезагрузите страницу."); next.revision++; await tx.query("INSERT INTO commerce_settings VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET value=$1", [JSON.stringify(next)]); await audit(user.id, "settings_changed", { revision: next.revision }, tx); }); return json({ settings: next });
    }
    if (route === "admin/sales" && method === "POST") {
      if (!Array.isArray(body.rows) || body.rows.length > 500) throw new CommerceError(400, "Не более 500 строк");
      await (await database()).transaction(async (tx) => { for (const row of body.rows as Record<string, unknown>[]) {
        if (!row || !["lemanapro", "yandex_market", "sponsor"].includes(str(row.provider)) || !["pending", "approved", "rejected", "paid"].includes(str(row.state)) || !str(row.reference).trim() || str(row.reference).length > 200 || !str(row.reportReference).trim() || str(row.reportReference).length > 300 || typeof row.commissionRub !== "number" || !Number.isFinite(row.commissionRub) || row.commissionRub < 0 || row.commissionRub > 1000000) throw new CommerceError(400, "Проверьте источник, номер продажи, статус, вознаграждение и ссылку на отчёт");
        await tx.query("INSERT INTO commerce_affiliate_sales VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(provider,reference,mode) DO UPDATE SET state=$3,commission=$4,report_reference=$5,updated_at=$7", [row.provider, row.reference, row.state, Math.round(row.commissionRub * 100), row.reportReference, mode, Date.now()]);
      } await audit(user.id, "affiliate_report_imported", { rows: (body.rows as unknown[]).length }, tx); }); return json({ ok: true });
    }
    if (route === "admin/refund" && method === "POST") return json(await startRefund(user.id, str(body.orderId), Number(body.amountKopecks), str(body.idempotencyKey)));
    if (route === "admin/refund-check" && method === "POST") return json(await checkRefund(str(body.refundId)));
    if (route === "admin/reconcile" && method === "POST") return json({ order: await reconcileOrder(str(body.orderId)) });
    throw new CommerceError(404, "Действие не найдено");
  } catch (error) {
    if (error instanceof CommerceError) return json({ error: error.message }, error.status);
    console.error("commerce request failed", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Не удалось выполнить действие. Повторите позже; если оплата прошла, не оплачивайте повторно — проверьте кабинет." }, 500);
  }
}
export const GET = handle;
export const POST = handle;
