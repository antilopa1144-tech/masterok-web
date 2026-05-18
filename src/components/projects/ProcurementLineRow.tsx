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
      className={`w-full rounded-lg border px-2.5 py-2 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent-500/30 ${
        price > 0
          ? "border-accent-200 bg-accent-50/40 dark:border-accent-800 dark:bg-accent-950/30"
          : "border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20"
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
  const sourceLabel =
    line.sources.length === 1 ? line.sources[0]!.calcTitle : `${line.sources.length} расчёта`;

  return (
    <div
      className={`px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 transition-colors ${
        purchased ? "bg-green-50/50 dark:bg-green-950/20" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <label className="flex items-center gap-2 shrink-0 cursor-pointer pt-0.5">
          <input
            type="checkbox"
            checked={purchased}
            onChange={onToggle}
            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-[11px] font-medium text-slate-500">Куплено</span>
        </label>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold leading-snug ${
              purchased
                ? "text-slate-400 line-through dark:text-slate-500"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {line.name}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sourceLabel}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Кол-во</p>
          <p className="text-sm font-bold tabular-nums">{formatQuantity(line.quantity, line.unit)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 min-w-0">
          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">₽/ед.</p>
          <PriceInput
            line={line}
            price={price}
            inputVal={inputVal}
            onPriceChange={onPriceChange}
            onPriceBlur={onPriceBlur}
          />
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Сумма</p>
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
  const sourceLabel =
    line.sources.length === 1 ? line.sources[0]!.calcTitle : `${line.sources.length} расчёта`;

  return (
    <div
      className={`grid grid-cols-[2rem_minmax(0,1fr)_6.5rem_6.5rem_6.5rem_6.5rem] gap-2 px-4 py-3 items-center border-b border-slate-50 dark:border-slate-800/60 transition-colors ${
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
        {purchased && (
          <span className="inline-flex mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
            Куплено
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
      <p className="text-[11px] text-slate-400 text-right leading-tight">{sourceLabel}</p>
    </div>
  );
}
