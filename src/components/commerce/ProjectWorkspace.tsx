"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommerceLogin } from "@/components/commerce/AccountPanel";
import RepairCart from "@/components/commerce/RepairCart";
import { getProjectEntryCountBucket, trackCommerceEvent } from "@/lib/analytics";
import ProjectProTools from "@/components/commerce/ProjectProTools";
import DocumentPreview from "@/components/commerce/DocumentPreview";
import MaterialPriceEditor from "@/components/commerce/MaterialPriceEditor";
import ProjectPackOffer from "@/components/commerce/ProjectPackOffer";
import { getProjectLayouts } from "@/lib/commerce/project-layouts";
import { buildProjectDocumentDraft } from "@/lib/commerce/project-draft";
import { getProjects } from "@/lib/storage/projects";
import type { ProjectDocumentInput, ProjectDocumentMaterialLine, ProjectDocumentWorkLine } from "@/lib/commerce/document-types";
import type { ProjectWithEntries } from "@/lib/storage/types";

type CommerceState = { enabled: boolean; mode: string; checkoutAvailable: boolean; packPriceKopecks: number; offerVersion: string; aiAvailable: boolean };
type Me = { user: { id: string } | null; state: CommerceState; access: { pro: boolean; pack: boolean } };
const draftKey = (id: string) => `masterok:document-draft:${id}`;
const mappingKey = (id: string) => `masterok:cloud-project:${id}`;
const money = (amount: number, provenance: string) => ({ amount, currency: "RUB" as const, provenance });

export default function ProjectWorkspace({ projectId, cloudId: queryCloudId }: { projectId: string; cloudId?: string }) {
  const [project, setProject] = useState<ProjectWithEntries | null>(null);
  const [document, setDocument] = useState<ProjectDocumentInput | null>(null);
  const [cloudId, setCloudId] = useState<string | undefined>(queryCloudId);
  const [version, setVersion] = useState<number | undefined>();
  const [me, setMe] = useState<Me | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pack, setPack] = useState(false);
  const [documentDirty, setDocumentDirty] = useState(false);
  const cartTracked = useRef(false);

  const persist = useCallback((next: ProjectDocumentInput) => {
    setDocument(next);
    setDocumentDirty(true);
    try { localStorage.setItem(draftKey(projectId), JSON.stringify(next)); }
    catch { setNotice("Черновик не удалось сохранить в браузере: освободите место и повторите."); }
  }, [projectId]);

  const refreshCart = useCallback(async () => {
    setProject((await getProjects()).find((item) => item.id === projectId) ?? null);
  }, [projectId]);
  const loadAccount = useCallback(async () => {
    try { const response = await fetch("/api/commerce/me"); if (response.ok) setMe(await response.json() as Me); }
    catch { setNotice("Нет связи с кабинетом. Локальный черновик доступен."); }
  }, []);
  useEffect(() => {
    let canceled = false;
    async function initialize() {
      try {
        const found = (await getProjects()).find((item) => item.id === projectId) ?? null;
        if (canceled) return; setProject(found);
        let draft: ProjectDocumentInput | null = null;
        try { draft = JSON.parse(localStorage.getItem(draftKey(projectId)) ?? "null"); } catch { /* Use calculation data. */ }
        if (!draft && found) draft = await buildProjectDocumentDraft(found);
        if (draft) setDocument(draft);
        const remembered = queryCloudId ?? localStorage.getItem(mappingKey(projectId));
        if (remembered) {
          setCloudId(remembered);
          const response = await fetch(`/api/commerce/projects/${encodeURIComponent(remembered)}`);
          if (response.ok) {
            const remote = await response.json(); if (canceled) return;
            setVersion(remote.version); setPack(remote.access.pack);
            if (queryCloudId || !draft) setDocument(remote.payload);
          } else if (!found && !draft) setNotice("Войдите в аккаунт владельца проекта через кабинет и откройте проект снова.");
        }
      } catch { if (!canceled) setNotice("Не удалось загрузить проект. Проверьте доступ к хранилищу браузера."); }
      finally { if (!canceled) setLoaded(true); }
    }
    void initialize(); void loadAccount();
    return () => { canceled = true; };
  }, [projectId, queryCloudId, loadAccount]);
  useEffect(() => {
    if (!loaded || !project || cartTracked.current) return;
    cartTracked.current = true;
    trackCommerceEvent("commerce_cart_open", { entry_count_bucket: getProjectEntryCountBucket(project.entries.length) });
  }, [loaded, project]);
  const syncDocument = async () => {
    if (!project) return;
    const next = await buildProjectDocumentDraft(project);
    next.materials = next.materials.map((line) => ({ ...line, unitPrice: document?.materials.find((old) => old.key === line.key)?.unitPrice ?? line.unitPrice }));
    persist({ ...next, parties: document?.parties, works: document?.works, delivery: document?.delivery, monetaryReserve: document?.monetaryReserve, terms: document?.terms });
    setNotice("Документ обновлён из корзины. Проверьте количества и цены.");
  };
  const changeMaterial = (index: number, patch: Partial<ProjectDocumentMaterialLine>) => document && persist({ ...document, materials: document.materials.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const changeWork = (index: number, patch: Partial<ProjectDocumentWorkLine>) => document && persist({ ...document, works: (document.works ?? []).map((item, i) => i === index ? { ...item, ...patch } : item) });

  async function saveDocument() {
    if (!document || !me?.user) throw new Error("Сначала войдите в кабинет");
    const response = await fetch("/api/commerce/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ localId: projectId, document, expectedVersion: version }) });
    const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Не удалось сохранить проект");
    setCloudId(body.id); setVersion(body.version); setPack(body.access.pack);
    setDocumentDirty(false);
    try { localStorage.setItem(mappingKey(projectId), body.id); } catch { /* Server save remains valid. */ }
    return body.id as string;
  }
  const saveCloud = async (): Promise<boolean> => {
    if (busy) return false; setBusy(true); setNotice("");
    try { await saveDocument(); setNotice("Проект сохранён в кабинете."); return true; }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Нет связи с сервером"); return false; }
    finally { setBusy(false); }
  };
  const download = async (format: "pdf" | "xlsx") => {
    if (busy) return; setBusy(true); setNotice("");
    try {
      const savedId = await saveDocument();
      const response = await fetch("/api/commerce/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: savedId, format, branded: Boolean(me?.access.pro) }) });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error ?? "Документ недоступен"); }
      const url = URL.createObjectURL(await response.blob()); const anchor = globalThis.document.createElement("a");
      anchor.href = url; anchor.download = `masterok-project.${format}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      trackCommerceEvent("commerce_document_download", { format }); setNotice("Документ создан и добавлен в кабинет.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Не удалось скачать документ"); } finally { setBusy(false); }
  };
  const checkout = async () => {
    if (!me || !accepted || busy) return; setBusy(true); setNotice("");
    try {
      const savedId = await saveDocument();
      const response = await fetch("/api/commerce/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "project_pack", projectId: savedId, expectedAmount: me.state.packPriceKopecks, acceptedOffer: me.state.offerVersion, recurring: false }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Не удалось начать оплату");
      trackCommerceEvent("commerce_checkout_start", { product: "project_pack" }); location.href = body.paymentUrl;
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Нет связи с сервером"); } finally { setBusy(false); }
  };
  if (!loaded) return <main className="page-container py-10"><p>Загружаем корзину…</p></main>;
  if (!document) return <main className="page-container py-10"><h1 className="text-xl font-bold">Проект не найден</h1><p className="mt-3">{notice || "Добавьте расчёт в проект, чтобы собрать закупку."}</p><Link href="/proekty/" className="btn-secondary mt-3">К проектам</Link><Link className="ml-3 underline" href="/kabinet/">Войти в кабинет</Link></main>;
  return <main className="page-container max-w-5xl py-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-700 dark:text-orange-300">Проект и закупка</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{document.project.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Уточните количество и цены материалов. Смета обновится сразу; документы проекта можно оформить отдельно.</p></div><Link className="btn-secondary" href={`/proekty/${projectId}/`}>К проекту</Link></div>
    {notice && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{notice}</p>}
    <nav aria-label="Разделы проекта" className="mt-5 flex gap-2 overflow-x-auto border-y border-slate-200 py-2 text-sm whitespace-nowrap dark:border-slate-700">{project && <a className="rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" href="#cart">Корзина</a>}<a className="rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" href="#preview">Смета</a>{me?.state.mode !== "off" && <a className="rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" href="#documents">Документы</a>}<a className="rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" href="#details">Работы и данные</a><a className="rounded-lg px-2 py-1 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" href="#layouts">Раскладки</a></nav>
    {project && <section id="cart"><RepairCart project={project} onChange={refreshCart} onSync={() => void syncDocument().catch(() => setNotice("Не удалось обновить документ"))} /></section>}
    <MaterialPriceEditor materials={document.materials} onChange={changeMaterial} />
    {me?.user && cloudId && documentDirty && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"><p className="max-w-2xl">Изменения видны в предпросмотре. Сохраните их, чтобы обновились документы и состав заказа.</p><button className="btn-primary" disabled={busy} onClick={() => void saveCloud()}>{busy ? "Сохраняем…" : "Сохранить для документов"}</button></div>}
    <DocumentPreview document={document} />
    {me?.state.mode === "off" ? <p className="mt-5 text-sm">Платные документы пока не подключены. Корзина и существующий бесплатный экспорт сметы доступны.</p> : me && <section id="documents" className="mt-5">
      <ProjectPackOffer
        document={document}
        priceKopecks={me.state.packPriceKopecks}
        mode={me.state.mode}
        checkoutAvailable={me.state.checkoutAvailable}
        hasAccess={Boolean(me.user) && (pack || me.access.pro)}
        accessFromPro={Boolean(me.user) && me.access.pro && !pack}
        signedIn={Boolean(me.user)}
        busy={busy}
        accepted={accepted}
        onAcceptedChange={setAccepted}
        onCheckout={() => void checkout()}
        onDownload={(format) => void download(format)}
      />
      {!me.user && <div className="mt-5"><CommerceLogin onSignedIn={loadAccount}/></div>}
    </section>}
    <section id="details" className="card mt-5 p-4"><h2 className="font-bold">Сведения и работы</h2><label className="mt-3 block text-sm font-medium">Объект<input aria-label="Объект" className="mt-2 w-full rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" placeholder="Объект" value={document.parties?.object??""} onChange={e=>persist({...document,parties:{...document.parties,object:e.target.value}})}/></label><label className="mt-3 block text-sm font-medium">Заказчик<input aria-label="Заказчик" className="mt-2 w-full rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" placeholder="Заказчик" value={document.parties?.customer?.name??""} onChange={e=>persist({...document,parties:{...document.parties,customer:{...document.parties?.customer,name:e.target.value}}})}/></label><label className="mt-3 block text-sm font-medium">Подрядчик<input aria-label="Подрядчик" className="mt-2 w-full rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" placeholder="Подрядчик" value={document.parties?.contractor?.name??""} onChange={e=>persist({...document,parties:{...document.parties,contractor:{...document.parties?.contractor,name:e.target.value}}})}/></label><button className="btn-secondary mt-3" onClick={()=>persist({...document,works:[...(document.works??[]),{key:`work-${Date.now()}`,name:"Работа",unit:"шт",quantity:1}]})}>Добавить работу</button>{(document.works??[]).map((w,i)=><div key={w.key} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5"><input aria-label="Работа" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" value={w.name} onChange={e=>changeWork(i,{name:e.target.value})}/><input aria-label="Единица работы" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" value={w.unit} onChange={e=>changeWork(i,{unit:e.target.value})}/><input aria-label="Количество работы" type="number" min="0" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" value={w.quantity} onChange={e=>changeWork(i,{quantity:Number(e.target.value)})}/><input aria-label="Цена работы" type="number" min="0" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" value={w.unitPrice?.amount??""} onChange={e=>changeWork(i,{unitPrice:e.target.value===""?undefined:money(Number(e.target.value),"ввёл пользователь")})}/><button className="text-red-600" onClick={()=>persist({...document,works:(document.works??[]).filter((_,n)=>n!==i)})}>Удалить</button></div>)}<div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="mt-3 block text-sm font-medium">Доставка<input aria-label="Доставка" type="number" min="0" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" placeholder="Доставка, ₽" value={document.delivery?.amount?.amount??""} onChange={e=>persist({...document,delivery:e.target.value===""?undefined:{amount:money(Number(e.target.value),"ввёл пользователь")}})}/></label><label className="mt-3 block text-sm font-medium">Денежный резерв<input aria-label="Денежный резерв" type="number" min="0" className="min-w-0 rounded border bg-white p-2 dark:border-slate-600 dark:bg-slate-900" placeholder="Денежный резерв, ₽" value={document.monetaryReserve?.amount.amount??""} onChange={e=>persist({...document,monetaryReserve:e.target.value===""?undefined:{amount:money(Number(e.target.value),"ввёл пользователь")}})}/></label></div></section>
    <section id="layouts" className="card mt-5 p-4">{document.layouts?.map((layout,index)=><figure key={`${layout.kind}-${index}`} className="mb-4"><figcaption className="text-sm font-semibold">{layout.title}</figcaption><p className="text-xs text-slate-500 dark:text-slate-400">{layout.summary}</p>{layout.image&&<Image unoptimized src={layout.image.dataUrl} alt={layout.title} width={layout.image.width} height={layout.image.height} className="mt-2 h-auto max-h-96 w-full rounded-lg bg-white object-contain"/>}</figure>)}<p className="text-sm">Сохранённых раскладок: {document.layouts?.length ?? 0}. <button className="text-accent-700" onClick={()=>persist({...document,layouts:getProjectLayouts(projectId)})}>Обновить схемы</button></p><button disabled={busy||!me?.user} className="btn-secondary mt-3" onClick={()=>void saveCloud()}>Сохранить в кабинет</button></section>
    {me?.user && me.access.pro && <div className="card mt-5 p-4 sm:p-5"><ProjectProTools cloudId={cloudId} enabled={me.access.pro} document={document} onDocumentChange={persist} onSave={saveCloud} aiAvailable={me.state.aiAvailable}/></div>}
  </main>;
}
