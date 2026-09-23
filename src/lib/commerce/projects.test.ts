import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

process.env.MONETIZATION_MODE = "local";
process.env.COMMERCE_LOCAL_DATA_DIR = "memory://";
process.env.COMMERCE_AUTH_SECRET = "test-commerce-secret-that-is-long-enough";

import { confirmPayment, createOrder, startRefund } from "./billing";
import { closeCommerceDatabase, database } from "./db";
import { createDocument, downloadDocument, saveServerProject, serverProject } from "./projects";
import type { CommerceUser } from "./types";

const document = (name = "Кухня") => ({
  project: { id: "local-id", name, documentDate: "2026-09-22" },
  materials: [{ key: "tile", name: "Плитка", unit: "м²", quantity: 12.5, unitPrice: { amount: 2490, currency: "RUB" as const, provenance: "цена заказчика" } }],
  works: [{ key: "laying", name: "Укладка", unit: "м²", quantity: 12.5 }],
  assumptions: ["Количество сформировано из сохранённого расчёта."],
});

async function user(email = `${randomUUID()}@example.test`): Promise<CommerceUser> {
  const id = randomUUID();
  await (await database()).query("INSERT INTO commerce_users(id,email,created_at) VALUES($1,$2,$3)", [id, email, Date.now()]);
  return { id, email, admin: false };
}

beforeAll(async () => { await database(); });
afterAll(async () => { await closeCommerceDatabase(); });

describe("server project and paid document boundary", () => {
  it("hides another account's project and blocks document generation before payment", async () => {
    const owner = await user();
    const foreign = await user();
    const project = await saveServerProject(owner.id, "kitchen", document());
    await expect(serverProject(foreign.id, project.id)).rejects.toMatchObject({ status: 404 });
    await expect(createDocument(owner.id, project.id, "pdf", false)).rejects.toMatchObject({ status: 403 });
  });

  it("uses the server price, grants a paid pack, creates real PDF/XLSX, then blocks downloads after refund", async () => {
    const owner = await user();
    const project = await saveServerProject(owner.id, "bath", {
      ...document("Санузел"),
      parties: { contractor: { name: "Мастер ремонта", contact: "+7 900 000-00-00" } },
    });
    await expect(createOrder(owner, { kind: "project_pack", projectId: project.id, expectedAmount: 1, acceptedOffer: "2026-09-22" })).rejects.toMatchObject({ status: 409 });
    const checkout = await createOrder(owner, { kind: "project_pack", projectId: project.id, expectedAmount: 24900, acceptedOffer: "2026-09-22" });
    await expect(createDocument(owner.id, project.id, "pdf", false)).rejects.toMatchObject({ status: 403 });
    await confirmPayment(String(checkout.order.invoice), checkout.order.amount, checkout.order.id, "local-pack");
    const pdf = await createDocument(owner.id, project.id, "pdf", false);
    const xlsx = await createDocument(owner.id, project.id, "xlsx", false);
    expect(new TextDecoder("latin1").decode(pdf.bytes.slice(0, 8))).toContain("%PDF");
    expect(xlsx.bytes.slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(xlsx.bytes) as never);
    const contractor = workbook.getWorksheet("Исходные данные")?.getRows(1, 20)?.find((row) => row.getCell(1).value === "Подрядчик");
    expect(contractor?.getCell(2).value).toBe("Мастер ремонта");
    expect(contractor?.getCell(3).value).toBe("'+7 900 000-00-00");
    await expect(startRefund("admin", checkout.order.id, checkout.order.amount, randomUUID())).resolves.toMatchObject({ state: "finished" });
    await expect(downloadDocument(owner.id, pdf.id)).rejects.toMatchObject({ status: 404 });
  }, 20_000);

  it("retains an already generated PRO document after its access period expires", async () => {
    const owner = await user();
    const project = await saveServerProject(owner.id, "hall", document("Прихожая"));
    const checkout = await createOrder(owner, { kind: "pro_month", expectedAmount: 39900, acceptedOffer: "2026-09-22" });
    await confirmPayment(String(checkout.order.invoice), checkout.order.amount, checkout.order.id, "local-pro", Date.now() - 1_000);
    const created = await createDocument(owner.id, project.id, "xlsx", true);
    await (await database()).query("UPDATE commerce_orders SET access_end=$1 WHERE id=$2", [Date.now() - 1, checkout.order.id]);
    const downloaded = await downloadDocument(owner.id, created.id);
    expect(downloaded.format).toBe("xlsx");
    expect(downloaded.bytes.slice(0, 2)).toEqual(new Uint8Array([80, 75]));
  }, 20_000);
});
