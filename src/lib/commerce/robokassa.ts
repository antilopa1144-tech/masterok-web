import { createHash, createHmac, timingSafeEqual, verify } from "node:crypto";
import { commerceMode } from "./config";
import { PROJECT_ESTIMATE_NAME } from "./product-copy";
import { CommerceError, type CommerceOrder } from "./types";

const localPassword = "local-simulation-only-no-real-payments";
function secret(number: 1 | 2 | 3): string {
  const value = process.env[`ROBOKASSA_PASSWORD${number}`];
  if (value) return value;
  if (commerceMode() === "local") return localPassword;
  throw new CommerceError(503, "Платёжный сервис ещё не подключён");
}

export function moneyToKopecks(value: string): number {
  if (!/^\d{1,8}(\.\d{1,6})?$/.test(value)) throw new CommerceError(400, "Некорректная сумма платежа");
  const [rubles, fraction = ""] = value.split(".");
  if (/[1-9]/.test(fraction.slice(2))) throw new CommerceError(400, "Сумма должна быть кратна копейке");
  return Number(rubles) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export const rubles = (kopecks: number): string => (kopecks / 100).toFixed(2);

export function paymentHash(text: string): string {
  const algorithm = (process.env.ROBOKASSA_HASH_ALGORITHM ?? "sha256").toLowerCase();
  if (!["md5", "sha256", "sha384", "sha512"].includes(algorithm)) throw new CommerceError(503, "Не настроен алгоритм подписи оплаты");
  return createHash(algorithm).update(text, "utf8").digest("hex");
}

export function resultSignature(amount: string, invoice: string, orderId: string): string {
  return paymentHash(`${amount}:${invoice}:${secret(2)}:Shp_order=${orderId}`);
}

export function verifyResult(params: URLSearchParams): { invoice: string; orderId: string; amount: number } {
  const amount = params.get("OutSum") ?? "";
  const invoice = params.get("InvId") ?? "";
  const orderId = params.get("Shp_order") ?? "";
  const signature = params.get("SignatureValue") ?? "";
  for (const key of ["OutSum", "InvId", "Shp_order", "SignatureValue"]) if (params.getAll(key).length !== 1) throw new CommerceError(400, "Неоднозначное уведомление");
  if (!/^[1-9]\d{0,17}$/.test(invoice) || !/^[\da-f-]{36}$/i.test(orderId)) throw new CommerceError(400, "Неизвестный платёж");
  if ([...params.keys()].some((key) => key.startsWith("Shp_") && key !== "Shp_order")) throw new CommerceError(400, "Неизвестные параметры подписи");
  const expected = resultSignature(amount, invoice, orderId);
  if (!/^[\da-f]+$/i.test(signature) || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature.toLowerCase()), Buffer.from(expected))) throw new CommerceError(403, "Неверная подпись платежа");
  return { invoice, orderId, amount: moneyToKopecks(amount) };
}

export function buildPaymentUrl(order: CommerceOrder, email: string): string {
  if (order.mode === "local") return `/oplata/${order.id}/`;
  if (order.mode !== commerceMode()) throw new CommerceError(409, "Режим платежа изменился. Создайте новый заказ.");
  const merchant = process.env.ROBOKASSA_MERCHANT_LOGIN;
  if (!merchant) throw new CommerceError(503, "Платёжный сервис ещё не подключён");
  const amount = rubles(order.amount);
  // Receipt value is URI-encoded before signature, then encoded by URLSearchParams for transport.
  const receipt = encodeURIComponent(JSON.stringify({ items: [{ name: order.kind === "project_pack" ? PROJECT_ESTIMATE_NAME : "Мастерок PRO — один месяц", quantity: 1, sum: order.amount / 100, tax: "none", payment_method: "full_payment", payment_object: "service" }] }));
  const result2 = process.env.ROBOKASSA_RESULT2_CERTIFICATE ? `${process.env.COMMERCE_ORIGIN ?? "https://getmasterok.ru"}/api/commerce/payment/result2` : undefined;
  const signature = paymentHash(`${merchant}:${amount}:${order.invoice}:${receipt}${result2 ? `:${encodeURIComponent(result2)}` : ""}:${secret(1)}:Shp_order=${order.id}`);
  const params = new URLSearchParams({ MerchantLogin: merchant, InvId: order.invoice, OutSum: amount, Description: order.kind === "project_pack" ? PROJECT_ESTIMATE_NAME : "Мастерок PRO на месяц", Receipt: receipt, SignatureValue: signature, Shp_order: order.id, Culture: "ru", Email: email });
  if (order.mode === "sandbox") params.set("IsTest", "1");
  if (result2) params.set("ResultUrl2", result2);
  if (order.recurring_consent) params.set("Recurring", "true");
  return `https://auth.robokassa.ru/Merchant/Index.aspx?${params}`;
}

export function verifyResult2(token: string): { invoice: string; amount: number; operation: string; state: string } {
  const parts = token.trim().split(".");
  const certificate = process.env.ROBOKASSA_RESULT2_CERTIFICATE?.replace(/\\n/g, "\n");
  if (!certificate) throw new CommerceError(503, "Сертификат Result2 не настроен");
  if (parts.length !== 3) throw new CommerceError(400, "Некорректное уведомление Result2");
  let header: { alg?: string }; let body: { data?: Record<string, string> };
  try { header = JSON.parse(Buffer.from(parts[0], "base64url").toString()); body = JSON.parse(Buffer.from(parts[1], "base64url").toString()); } catch { throw new CommerceError(400, "Некорректное уведомление Result2"); }
  if (header.alg !== "RS256" || !verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), certificate, Buffer.from(parts[2], "base64url"))) throw new CommerceError(403, "Неверная подпись Result2");
  const data = body.data;
  if (!data || data.shop !== process.env.ROBOKASSA_MERCHANT_LOGIN || !/^\d+$/.test(String(data.invId)) || !data.opKey || data.opKey.length > 150) throw new CommerceError(400, "Некорректные реквизиты Result2");
  return { invoice: String(data.invId), amount: moneyToKopecks(String(data.incSum)), operation: data.opKey, state: data.state };
}

export async function requestRecurring(order: CommerceOrder, previousInvoice: string): Promise<void> {
  const initial = new URL(buildPaymentUrl(order, ""));
  initial.searchParams.delete("Recurring");
  initial.searchParams.delete("InvId");
  initial.searchParams.set("InvoiceID", order.invoice);
  initial.searchParams.set("PreviousInvoiceID", previousInvoice);
  const response = await fetch("https://auth.robokassa.ru/Merchant/Recurring", { method: "POST", body: initial.searchParams, signal: AbortSignal.timeout(15000) });
  const body = await response.text();
  if (!response.ok || !body.startsWith(`OK${order.invoice}`)) throw new CommerceError(502, "Статус продления нужно проверить в Robokassa. Повторный запрос автоматически не отправляется.");
  // OK only acknowledges creation. Entitlement is granted by verified ResultURL.
}

export async function queryOperation(invoice: string): Promise<{ state: number; amount?: number; creditedAmount?: number; orderId?: string; operation?: string }> {
  if (commerceMode() !== "live") throw new CommerceError(409, "OpStateExt доступен только для реальных операций Robokassa");
  const merchant = process.env.ROBOKASSA_MERCHANT_LOGIN ?? "";
  const parameters = new URLSearchParams({ MerchantLogin: merchant, InvoiceID: invoice, Signature: paymentHash(`${merchant}:${invoice}:${secret(2)}`) });
  const response = await fetch(`https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt?${parameters}`, { signal: AbortSignal.timeout(15000) });
  const xml = await response.text();
  if (!response.ok || xml.length > 100000 || !/<Result>\s*<Code>0<\/Code>/i.test(xml)) throw new CommerceError(502, "Robokassa пока не подтвердила состояние операции");
  const state = Number(xml.match(/<State>\s*<Code>(\d+)<\/Code>/i)?.[1]);
  const paid = xml.match(/<IncSum>([\d.]+)<\/IncSum>/i)?.[1];
  const credited = xml.match(/<OutSum>([\d.]+)<\/OutSum>/i)?.[1];
  const currency = xml.match(/<OutCurrLabel>([^<]+)<\/OutCurrLabel>/i)?.[1];
  if (credited && currency && !["RUB", "RUR"].includes(currency)) throw new CommerceError(502, "Неожиданная валюта зачисления");
  // OutSum is the amount credited to the merchant and may be lower after commission.
  const orderFields = [...xml.matchAll(/<Field>\s*<Name>Shp_order<\/Name>\s*<Value>([\da-f-]{36})<\/Value>\s*<\/Field>/gi)];
  if (orderFields.length > 1) throw new CommerceError(502, "Неоднозначный заказ в ответе Robokassa");
  return { state, amount: paid ? moneyToKopecks(paid) : undefined, creditedAmount: credited ? moneyToKopecks(credited) : undefined, orderId: orderFields[0]?.[1], operation: xml.match(/<OpKey>([\w-]+)<\/OpKey>/i)?.[1] };
}

export async function createProviderRefund(operation: string, amount: number, kind: string, fullRefund = false): Promise<string> {
  if (process.env.COMMERCE_CHECKS_NPD_CONFIRMED !== "true") throw new CommerceError(503, "Сначала подтвердите оформление чеков возврата НПД");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ OpKey: operation, ...(fullRefund ? {} : { RefundSum: amount / 100 }), InvoiceItems: [{ Name: kind === "project_pack" ? PROJECT_ESTIMATE_NAME : "Мастерок PRO", Quantity: 1, Cost: amount / 100, Tax: "none", PaymentMethod: "full_payment", PaymentObject: "service" }] })).toString("base64url");
  const signature = createHmac("sha256", secret(3)).update(`${header}.${payload}`).digest("base64url");
  const response = await fetch("https://services.robokassa.ru/RefundService/Refund/Create", { method: "POST", body: `${header}.${payload}.${signature}`, headers: { "content-type": "text/plain" }, signal: AbortSignal.timeout(15000) });
  const value = await response.json();
  if (!response.ok || value.success !== true || typeof value.requestId !== "string") throw new CommerceError(502, "Возврат не подтверждён. Проверьте операцию в кабинете Robokassa перед повторной попыткой.");
  return value.requestId;
}

export async function queryProviderRefund(requestId: string): Promise<{ finished: boolean; canceled: boolean; amount?: number }> {
  const response = await fetch(`https://services.robokassa.ru/RefundService/Refund/GetState?id=${encodeURIComponent(requestId)}`, { signal: AbortSignal.timeout(15000) });
  const value = await response.json();
  if (!response.ok || value.requestId !== requestId) throw new CommerceError(502, "Статус возврата пока не получен");
  return { finished: value.label === "finished", canceled: value.label === "canceled", amount: typeof value.amount === "number" ? Math.round(value.amount * 100) : undefined };
}
