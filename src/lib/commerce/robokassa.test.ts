import { createHash, createHmac, generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

process.env.MONETIZATION_MODE = "local";
import { commerceMode } from "./config";
import { buildPaymentUrl, createProviderRefund, queryOperation, queryProviderRefund, resultSignature, verifyResult, verifyResult2 } from "./robokassa";
import type { CommerceOrder } from "./types";

const envNames = ["MONETIZATION_MODE", "ROBOKASSA_MERCHANT_LOGIN", "ROBOKASSA_PASSWORD1", "ROBOKASSA_PASSWORD2", "ROBOKASSA_PASSWORD3", "ROBOKASSA_HASH_ALGORITHM", "ROBOKASSA_RESULT2_CERTIFICATE", "COMMERCE_ORIGIN", "COMMERCE_CHECKS_NPD_CONFIRMED"] as const;
const initialEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of envNames) {
    const value = initialEnv[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

describe("Robokassa callback boundary", () => {
  it("rejects a bad callback signature before billing sees the amount", () => {
    const params = new URLSearchParams({ OutSum: "399.00", InvId: "100001", Shp_order: "11111111-1111-1111-1111-111111111111", SignatureValue: "deadbeef" });
    expect(() => verifyResult(params)).toThrow(/Неверная подпись/);
  });

  it("accepts only the exact signed callback fields", () => {
    const invoice = "100001"; const orderId = "11111111-1111-1111-1111-111111111111"; const amount = "399.00";
    const params = new URLSearchParams({ OutSum: amount, InvId: invoice, Shp_order: orderId, SignatureValue: resultSignature(amount, invoice, orderId) });
    expect(verifyResult(params)).toEqual({ invoice, orderId, amount: 39900 });
  });

  it("keeps local, sandbox and live modes distinct", () => {
    const initial = process.env.MONETIZATION_MODE;
    process.env.MONETIZATION_MODE = "sandbox"; expect(commerceMode()).toBe("sandbox");
    process.env.MONETIZATION_MODE = "live"; expect(commerceMode()).toBe("live");
    process.env.MONETIZATION_MODE = initial; expect(commerceMode()).toBe("local");
  });

  it("builds a test-only provider URL with the signed encoded receipt", () => {
    process.env.MONETIZATION_MODE = "sandbox";
    process.env.ROBOKASSA_MERCHANT_LOGIN = "test-shop";
    process.env.ROBOKASSA_PASSWORD1 = "test-password-one";
    process.env.ROBOKASSA_HASH_ALGORITHM = "sha256";
    const order = { id: "11111111-1111-1111-1111-111111111111", invoice: "100001", amount: 24900, kind: "project_pack", mode: "sandbox" } as CommerceOrder;
    const url = new URL(buildPaymentUrl(order, "buyer@example.test"));
    expect(url.origin).toBe("https://auth.robokassa.ru");
    expect(url.searchParams.get("IsTest")).toBe("1");
    expect(url.searchParams.get("OutSum")).toBe("249.00");
    const receipt = url.searchParams.get("Receipt")!;
    expect(JSON.parse(decodeURIComponent(receipt)).items[0]).toMatchObject({ name: "Смета проекта в PDF и XLSX", sum: 249, tax: "none", payment_object: "service" });
    expect(url.searchParams.get("Description")).toBe("Смета проекта в PDF и XLSX");
    const base = `test-shop:249.00:100001:${receipt}:test-password-one:Shp_order=${order.id}`;
    expect(url.searchParams.get("SignatureValue")).toBe(createHash("sha256").update(base).digest("hex"));
  });

  it("signs partial refunds with Password3 and reconciles only the provider's completed amount", async () => {
    process.env.ROBOKASSA_PASSWORD3 = "test-password-three";
    process.env.COMMERCE_CHECKS_NPD_CONFIRMED = "true";
    const providerRequest = "22222222-2222-2222-2222-222222222222";
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ success: true, requestId: providerRequest }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ requestId: providerRequest, amount: 100.25, label: "finished" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await createProviderRefund("operation-test", 10025, "project_pack")).toBe(providerRequest);
    const [target, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(target).toBe("https://services.robokassa.ru/RefundService/Refund/Create");
    const [header, payload, signature] = String(options.body).split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toMatchObject({ alg: "HS256", typ: "JWT" });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toMatchObject({ OpKey: "operation-test", RefundSum: 100.25, InvoiceItems: [{ Cost: 100.25, Tax: "none" }] });
    expect(signature).toBe(createHmac("sha256", "test-password-three").update(`${header}.${payload}`).digest("base64url"));
    expect(await queryProviderRefund(providerRequest)).toEqual({ finished: true, canceled: false, amount: 10025 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a tampered Result2 even if its payment state says OK", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.ROBOKASSA_MERCHANT_LOGIN = "test-shop";
    process.env.ROBOKASSA_RESULT2_CERTIFICATE = publicKey.export({ type: "spki", format: "pem" }).toString();
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ data: { shop: "test-shop", invId: "100001", opKey: "operation-test", incSum: "249.00", state: "OK" } })).toString("base64url");
    const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
    expect(verifyResult2(`${header}.${payload}.${signature}`)).toMatchObject({ invoice: "100001", amount: 24900, state: "OK" });
    const tampered = Buffer.from(JSON.stringify({ data: { shop: "test-shop", invId: "100001", opKey: "operation-test", incSum: "2490.00", state: "OK" } })).toString("base64url");
    expect(() => verifyResult2(`${header}.${tampered}.${signature}`)).toThrow("Неверная подпись");
  });

  it("reconciles the buyer amount, not the smaller amount credited after commission", async () => {
    process.env.MONETIZATION_MODE = "live";
    process.env.ROBOKASSA_MERCHANT_LOGIN = "test-shop";
    process.env.ROBOKASSA_PASSWORD2 = "test-password-two";
    const orderId = "11111111-1111-1111-1111-111111111111";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`<OperationStateResponse><Result><Code>0</Code></Result><State><Code>100</Code></State><Info><IncCurrLabel>BankCardPSR</IncCurrLabel><IncSum>249.00</IncSum><OutCurrLabel>RUB</OutCurrLabel><OutSum>240.53</OutSum><OpKey>operation-test</OpKey></Info><UserFields><Field><Name>Shp_order</Name><Value>${orderId}</Value></Field></UserFields></OperationStateResponse>`, { status: 200 })));
    expect(await queryOperation("100001")).toEqual({ state: 100, amount: 24900, creditedAmount: 24053, orderId, operation: "operation-test" });
  });
});
