"use client";

import { useEffect, useMemo, useState } from "react";
import type { MaterialResult } from "@/lib/calculators/types";
import { PROCUREMENT_PILOT, type MaterialOffer } from "@/lib/commerce/types";
import { getMaterialGuidance } from "@/lib/commerce/material-guidance";
import { trackCommerceEvent } from "@/lib/analytics";
import { procurementPilotForCalculator } from "@/lib/commerce/material-snapshot";

interface Props {
  calculatorId?: string;
  calculatorSlug?: string;
  materials: MaterialResult[];
}

function isPilot(slug?: string): slug is (typeof PROCUREMENT_PILOT)[number] {
  return Boolean(slug && (PROCUREMENT_PILOT as readonly string[]).includes(slug));
}

function quantityText(material: MaterialResult): string {
  const amount = material.purchaseQty ?? material.withReserve ?? material.quantity;
  return `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 3 })} ${material.unit}`;
}

export default function MaterialSelection({ calculatorId, calculatorSlug, materials }: Props) {
  const [open, setOpen] = useState(false);
  const [offers, setOffers] = useState<MaterialOffer[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "unavailable">("idle");
  const pilot = procurementPilotForCalculator(calculatorId) ?? (isPilot(calculatorSlug) ? calculatorSlug : undefined);
  const guidance = useMemo(() => pilot ? getMaterialGuidance(pilot) : null, [pilot]);

  useEffect(() => {
    if (!open || !pilot) return;
    const controller = new AbortController();
    setLoadState("loading");
    fetch(`/api/commerce/offers?calculator=${encodeURIComponent(pilot)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Offers unavailable: ${response.status}`);
        const data = await response.json() as { offers?: MaterialOffer[] };
        setOffers(Array.isArray(data.offers) ? data.offers : []);
        setLoadState("idle");
      })
      .catch((error: unknown) => {
        if (typeof error === "object" && error && "name" in error && error.name === "AbortError") return;
        setOffers(null);
        setLoadState("unavailable");
      });
    return () => controller.abort();
  }, [open, pilot]);

  if (!pilot || materials.length === 0) return null;

  return (
    <section className="border-t border-slate-100 px-4 py-4 sm:px-5 dark:border-slate-700" aria-label="Подобрать материалы">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:border-accent-300 hover:text-accent-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
        onClick={() => setOpen((value) => {
          const next = !value;
          if (next) trackCommerceEvent("commerce_materials_open", { calculator: pilot });
          return next;
        })}
        aria-expanded={open}
      >
        <span>Подобрать материалы</span>
        <span aria-hidden className="text-slate-400">{open ? "⌃" : "⌄"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">Ваш расчёт</p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {materials.map((material, index) => (
                <li key={`${material.name}-${index}`}>
                  <span className="font-medium">{material.name}</span> — {quantityText(material)}
                  {material.subtitle ? ` · ${material.subtitle}` : ""}
                  {material.packageInfo ? ` · ${material.packageInfo.count} ${material.packageInfo.packageUnit} × ${material.packageInfo.size} ${material.unit}` : ""}
                </li>
              ))}
            </ul>
          </div>

          {guidance && (
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{guidance.title}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {guidance.checks.map((check) => <li key={check}>{check}</li>)}
              </ul>
            </div>
          )}

          {loadState === "loading" && <p className="text-xs text-slate-500">Проверяем доступные предложения…</p>}
          {loadState === "unavailable" && <p className="text-xs text-slate-500">Предложения сейчас недоступны. Расчёт и список материалов сохранены выше.</p>}
          {offers?.length === 0 && <p className="text-xs text-slate-500">Подходящих рекламных предложений сейчас нет.</p>}
          {offers && offers.length > 0 && (
            <div className="space-y-2">
              {offers.map((offer) => (
                <article key={offer.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Реклама</p>
                  <a
                    href={`/api/commerce/go/${encodeURIComponent(offer.id)}?calculator=${encodeURIComponent(pilot)}`}
                    target="_blank"
                    rel="sponsored nofollow noopener"
                    onClick={() => trackCommerceEvent("commerce_offer_click", { offer_id: offer.id, calculator: pilot })}
                    className="mt-1 block font-semibold text-accent-700 hover:underline dark:text-accent-300"
                  >
                    {offer.title}
                  </a>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{offer.suitability}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Ограничения: {offer.limitations}</p>
                  <p className="mt-1.5 text-[10px] text-slate-400">Рекламодатель: {offer.advertiser} · ИНН {offer.advertiserInn} · erid: {offer.erid}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
