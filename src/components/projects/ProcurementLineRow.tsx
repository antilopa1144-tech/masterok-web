"use client";

import { useEffect, useState } from "react";
import { formatCost, formatQuantity } from "@/lib/projects/format";
import type { ProcurementLine } from "@/lib/projects/procurement";

export interface ProcurementLineRowProps {
  line: ProcurementLine;
  price: number;
  sum: number;
  inputVal: string;
  purchased: boolean;
  onToggle: () => void;
  onPriceChange: (raw: string) => void;
  onPriceBlur: () => void;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

function displayMaterialName(name: string) {
  return name.replace(/^\[[^\]]+\]\s*/, "");
}

export default function ProcurementLineRow(props: ProcurementLineRowProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopRow {...props} /> : <MobileRow {...props} />;
}

function PriceInput({
  line,
  price,
  inputVal,
  onPriceChange,
  onPriceBlur,
}: Pick<ProcurementLineRowProps, "line" | "price" | "inputVal" | "onPriceChange" | "onPriceBlur">) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputVal}
      placeholder="0"
      onChange={(e) => onPriceChange(e.target.value)}
      onBlur={onPriceBlur}
      className={`w-full rounded-lg border px-2.5 py-2 text-right text-sm tabular-nums outline-none transition-colors focus:border-accent-400 focus:ring-2 focus:ring-accent-500/30 ${
        price > 0
          ? "border-slate-200 bg-transparent dark:border-slate-700"
          : "border-dashed border-slate-300 bg-slate-50/60 text-slate-500 dark:border-slate-600 dark:bg-slate-800/40"
      }`}
      aria-label={`Цена: ${line.name}`}
    />
  );
}

function MobileRow({
  line,
  price,
  sum,
  inputVal,
  purchased,
  onToggle,
  onPriceChange,
  onPriceBlur,
}: ProcurementLineRowProps) {
  const multiSource = line.sources.length > 1;
  const specifications = line.subtitles ?? [];

  return (
    <div
      className={`border-b border-slate-100 px-3 py-3 transition-colors dark:border-slate-800 ${
        purchased ? "bg-green-50/50 dark:bg-green-950/20" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <label className="-ml-1 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
          <input
            type="checkbox"
            checked={purchased}
            onChange={onToggle}
            className="h-5 w-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
            aria-label={`Куплено: ${line.name}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold leading-snug ${
              purchased
                ? "text-slate-400 line-through dark:text-slate-500"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {displayMaterialName(line.name)}
          </p>
          {specifications.map((specification) => (
            <p key={specification} className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              {specification}
            </p>
          ))}
          {multiSource && (
            <p className="mt-0.5 truncate text-[11px] text-slate-400">из {line.sources.length} расчётов</p>
          )}
        </div>
        <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {formatQuantity(line.quantity, line.unit)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(7rem,auto)] items-end gap-2 pl-10">
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Цена за ед., ₽</span>
          <PriceInput
            line={line}
            price={price}
            inputVal={inputVal}
            onPriceChange={onPriceChange}
            onPriceBlur={onPriceBlur}
          />
        </label>
        <div className="pb-2 text-right">
          <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Сумма</p>
          <p
            className={`text-sm font-black tabular-nums ${
              sum > 0 ? "text-accent-700 dark:text-accent-300" : "text-slate-400"
            }`}
          >
            {sum > 0 ? `${formatCost(sum)} ₽` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function DesktopRow({
  line,
  price,
  sum,
  inputVal,
  purchased,
  onToggle,
  onPriceChange,
  onPriceBlur,
}: ProcurementLineRowProps) {
  // Источник (название калькулятора) больше не дублируется в каждой строке —
  // он показан в заголовке группы. В строке оставляем его только когда позиция
  // собрана из нескольких расчётов (это реально полезная пометка).
  const multiSource = line.sources.length > 1;
  const specifications = line.subtitles ?? [];

  return (
    <div
      className={`grid grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_8rem] gap-2 px-4 py-3 items-center border-b border-slate-50 dark:border-slate-800/60 transition-colors ${
        purchased
          ? "bg-green-50/60 dark:bg-green-950/25"
          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/30"
      }`}
    >
      <label className="flex justify-center cursor-pointer" title="Отметить как куплено">
        <input
          type="checkbox"
          checked={purchased}
          onChange={onToggle}
          className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          aria-label={`Куплено: ${line.name}`}
        />
      </label>
      <div className="min-w-0">
        <p
          className={`text-sm font-medium leading-snug ${
            purchased
              ? "text-slate-400 line-through decoration-slate-400/80 dark:text-slate-500"
              : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {line.name}
        </p>
        {specifications.map((specification) => (
          <p key={specification} className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {specification}
          </p>
        ))}
        {purchased && (
          <span className="inline-flex mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
            Куплено
          </span>
        )}
        {multiSource && !purchased && (
          <span className="inline-flex mt-0.5 text-[10px] font-medium text-slate-400">
            из {line.sources.length} расчётов
          </span>
        )}
      </div>
      <p className="text-sm font-semibold tabular-nums text-right">
        {formatQuantity(line.quantity, line.unit)}
      </p>
      <PriceInput
        line={line}
        price={price}
        inputVal={inputVal}
        onPriceChange={onPriceChange}
        onPriceBlur={onPriceBlur}
      />
      <p className={`text-sm font-bold tabular-nums text-right ${sum > 0 ? "" : "text-slate-400"}`}>
        {sum > 0 ? `${formatCost(sum)} ₽` : "—"}
      </p>
    </div>
  );
}
