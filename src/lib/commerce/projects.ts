import { randomUUID } from "node:crypto";
import { database } from "./db";
import { CommerceError, type CommerceOrder } from "./types";
import { accessFor, audit, funnel, normalizeOrder, ownedProject } from "./billing";
import { commerceMode } from "./config";
import { consumeLimit } from "./auth";
import type { ProjectDocumentInput } from "./document-types";
import { buildDocumentTotals, generateProjectPdf, generateProjectXlsx, validateProjectDocumentInput } from "./documents";

function validatedDocument(raw: unknown): ProjectDocumentInput {
  try { validateProjectDocumentInput(raw as ProjectDocumentInput); }
  catch { throw new CommerceError(400, "Проверьте проект: нужны название, корректные количества и цены, не более 300 позиций и 5 раскладок."); }
  return raw as ProjectDocumentInput;
}

export async function saveServerProject(userId: string, localId: unknown, raw: unknown, expectedVersion?: unknown) {
  if (typeof localId !== "string" || !/^[\w:-]{1,150}$/.test(localId)) throw new CommerceError(400, "Неизвестный локальный проект");
  const input = structuredClone(validatedDocument(raw));
  return (await database()).transaction(async (tx) => {
    await consumeLimit(`save:${userId}`, 120, 3600000, tx);
    const existing = (await tx.query<{ id: string; version: number; payload: ProjectDocumentInput }>("SELECT * FROM commerce_projects WHERE user_id=$1 AND local_id=$2", [userId, localId])).rows[0];
    if (existing && expectedVersion !== existing.version) throw new CommerceError(409, "Проект изменён на другом устройстве. Загрузите его текущую версию перед сохранением.");
    const count = Number((await tx.query<{ count: string }>("SELECT COUNT(*) AS count FROM commerce_projects WHERE user_id=$1", [userId])).rows[0]?.count ?? 0);
    if (!existing && count >= 100) throw new CommerceError(409, "Достигнут лимит серверного хранилища. Локальные проекты остаются доступны.");
    const id = existing?.id ?? randomUUID();
    const version = (existing?.version ?? 0) + 1;
    input.project = { ...input.project, id, documentDate: new Date().toISOString().slice(0, 10), version: String(version) };
    const payload = JSON.stringify(input);
    const now = Date.now();
    if (existing) await tx.query("UPDATE commerce_projects SET name=$1,payload=$2,version=$3,updated_at=$4 WHERE id=$5", [input.project.name, payload, version, now, id]);
    else await tx.query("INSERT INTO commerce_projects VALUES($1,$2,$3,$4,$5,$6,$7)", [id, userId, localId, input.project.name, payload, version, now]);
    const access = await accessFor(userId, id, tx);
    if (access.pro) await tx.query("INSERT INTO commerce_versions VALUES($1,$2,$3,$4,$5)", [randomUUID(), id, version, payload, now]);
    await audit(userId, "project_saved", { projectId: id, version }, tx);
    return { id, localId, version, payload: input, access };
  });
}

export async function serverProject(userId: string, projectId: string) {
  const project = await ownedProject(userId, projectId);
  return { ...project, access: await accessFor(userId, projectId) };
}

export async function projectVersions(userId: string, projectId: string) {
  await ownedProject(userId, projectId);
  if (!(await accessFor(userId)).pro) throw new CommerceError(403, "История версий доступна в PRO. Текущая смета и сохранённые документы остаются у вас.");
  return (await (await database()).query<{ id: string; version: number; payload: ProjectDocumentInput; created_at: string }>("SELECT * FROM commerce_versions WHERE project_id=$1 ORDER BY version DESC LIMIT 30", [projectId])).rows;
}

export async function templates(userId: string) {
  if (!(await accessFor(userId)).pro) throw new CommerceError(403, "Шаблоны для повторной работы доступны в PRO");
  return (await (await database()).query<{ id: string; name: string; payload: Pick<ProjectDocumentInput, "parties" | "works" | "terms"> }>("SELECT id,name,payload FROM commerce_templates WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 30", [userId])).rows;
}

export async function saveTemplate(userId: string, projectId: string, name: unknown): Promise<void> {
  if (typeof name !== "string" || !name.trim() || name.length > 100) throw new CommerceError(400, "Название шаблона — от 1 до 100 символов");
  await (await database()).transaction(async (tx) => {
    if (!(await accessFor(userId, undefined, tx)).pro) throw new CommerceError(403, "Шаблоны доступны в PRO");
    const project = await ownedProject(userId, projectId, tx);
    const doc = project.payload as ProjectDocumentInput;
    // Customer/object details are intentionally not copied into reusable templates.
    const value = { parties: { contractor: doc.parties?.contractor }, works: (doc.works ?? []).map((line) => ({ ...line, quantity: 0 })), terms: doc.terms };
    const current = (await tx.query<{ id: string }>("SELECT id FROM commerce_templates WHERE user_id=$1 AND name=$2", [userId, name.trim()])).rows[0];
    const count = Number((await tx.query<{ count: string }>("SELECT COUNT(*) AS count FROM commerce_templates WHERE user_id=$1", [userId])).rows[0]?.count ?? 0);
    if (!current && count >= 30) throw new CommerceError(409, "Сохранено 30 шаблонов. Обновите существующий шаблон с тем же названием.");
    if (current) await tx.query("UPDATE commerce_templates SET payload=$1,updated_at=$2 WHERE id=$3", [JSON.stringify(value), Date.now(), current.id]);
    else await tx.query("INSERT INTO commerce_templates VALUES($1,$2,$3,$4,$5)", [randomUUID(), userId, name.trim(), JSON.stringify(value), Date.now()]);
  });
}

export async function createDocument(userId: string, projectId: string, format: string, branded: boolean) {
  if (format !== "pdf" && format !== "xlsx") throw new CommerceError(400, "Выберите PDF или XLSX");
  await consumeLimit(`export:${userId}`, 60, 3600000);
  const project = await ownedProject(userId, projectId);
  const access = await accessFor(userId, projectId);
  if (!(access.pack || access.pro)) throw new CommerceError(403, "Для комплекта документов нужна покупка этого проекта или PRO");
  if (branded && !access.pro) throw new CommerceError(403, "Фирменное оформление доступно в PRO");
  const input = structuredClone(project.payload) as ProjectDocumentInput;
  const bytes = format === "pdf" ? await generateProjectPdf(input) : await generateProjectXlsx(input);
  const id = randomUUID();
  await (await database()).transaction(async (tx) => {
    const now = Date.now();
    const paidOrders = (await tx.query<CommerceOrder>("SELECT * FROM commerce_orders WHERE user_id=$1 AND mode=$2 AND state IN ('paid','partially_refunded')", [userId, commerceMode()])).rows.map(normalizeOrder);
    const grant = (!branded && paidOrders.find((o) => o.kind === "project_pack" && o.project_id === projectId)) || paidOrders.find((o) => o.kind === "pro_month" && (o.access_start ?? Infinity) <= now && (o.access_end ?? 0) > now);
    if (!grant) throw new CommerceError(403, "Оплаченный доступ изменился. Проверьте его в кабинете.");
    await tx.query("INSERT INTO commerce_documents(id,user_id,project_id,format,payload,created_at,grant_order_id) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, userId, projectId, format, JSON.stringify(input), now, grant.id]);
    await funnel("document_generated", "server", { format, branded }, tx);
  });
  return { id, format, bytes, name: input.project.name };
}

export async function downloadDocument(userId: string, documentId: string) {
  await consumeLimit(`download:${userId}`, 90, 3600000);
  const document = (await (await database()).query<{ id: string; format: "pdf" | "xlsx"; payload: ProjectDocumentInput }>("SELECT d.* FROM commerce_documents d JOIN commerce_orders o ON o.id=d.grant_order_id WHERE d.id=$1 AND d.user_id=$2 AND o.mode=$3 AND o.state IN ('paid','partially_refunded')", [documentId, userId, commerceMode()])).rows[0];
  if (!document) throw new CommerceError(404, "Документ не найден или оплата возвращена");
  const bytes = document.format === "pdf" ? await generateProjectPdf(document.payload) : await generateProjectXlsx(document.payload);
  return { ...document, bytes, name: document.payload.project.name };
}

export function compareProjectDocuments(before: ProjectDocumentInput, after: ProjectDocumentInput) {
  const beforeLines = [...before.materials, ...(before.works ?? [])];
  const afterLines = [...after.materials, ...(after.works ?? [])];
  const keys = new Set([...beforeLines.map((l) => l.key), ...afterLines.map((l) => l.key)]);
  const changes = [...keys].flatMap((key) => {
    const old = beforeLines.find((l) => l.key === key); const next = afterLines.find((l) => l.key === key);
    if (JSON.stringify(old) === JSON.stringify(next)) return [];
    return [{ name: next?.name ?? old?.name ?? key, before: old?.quantity ?? null, after: next?.quantity ?? null, unit: next?.unit ?? old?.unit, oldPrice: old?.unitPrice?.amount ?? null, newPrice: next?.unitPrice?.amount ?? null }];
  });
  return { changes, beforeTotal: buildDocumentTotals(before), afterTotal: buildDocumentTotals(after) };
}
