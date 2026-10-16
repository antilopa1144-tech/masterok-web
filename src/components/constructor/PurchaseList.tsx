import { useId, useState, type ReactNode } from "react";
import type { ConstructorRoom, PurchaseLine } from "@/lib/constructor/core";
import { searchPurchases } from "@/lib/constructor/purchase-search";
import styles from "./constructor.module.css";

export default function PurchaseList({ lines, rooms, renderLine, actions }: {
  lines: readonly PurchaseLine[];
  rooms: readonly ConstructorRoom[];
  renderLine: (line: PurchaseLine) => ReactNode;
  actions: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "unpriced">("all");
  const id = useId();
  const visible = searchPurchases(lines, rooms, query, scope);
  const unpricedCount = lines.filter(line => !(line.unitPriceRub > 0)).length;
  return <>
    <details className={styles.purchaseTools}>
      <summary>Найти или скопировать список{(query.trim() || scope === "unpriced") && <small>{scope === "unpriced" ? "Без цены" : "Поиск применён"}: {visible.length} из {lines.length}</small>}</summary>
      {actions}
      {lines.length > 0 && <div className={styles.purchaseFilter} role="group" aria-label="Фильтр по цене">
        <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>Все позиции · {lines.length}</button>
        <button type="button" aria-pressed={scope === "unpriced"} onClick={() => setScope("unpriced")}>Без цены · {unpricedCount}</button>
      </div>}
    {lines.length > 1 && <div className={styles.purchaseSearch}>
      <label htmlFor={id}>Найти материал</label>
      <div><input id={id} type="search" value={query} maxLength={120} placeholder="Название, формат или помещение" aria-describedby={`${id}-hint`} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" className={styles.secondaryButton} onClick={() => setQuery("")}>Сбросить поиск</button>}
      </div>
      <p id={`${id}-hint`}>Поиск и фильтр меняют только список на экране. Количества, общая стоимость, копирование, PDF и XLSX относятся ко всему проекту.</p>
      <p role="status" aria-live="polite">Показано позиций: {visible.length} из {lines.length}</p>
    </div>}
    </details>
    {visible.length ? <div className={styles.purchaseList}>{visible.map(renderLine)}</div> : <p className={styles.purchaseIntro}>{scope === "unpriced" ? "Позиций без цены по этим условиям не найдено. Выберите «Все позиции» или сбросьте поиск." : "Материалы не найдены. Попробуйте другое название, размер или сбросьте поиск."}</p>}
  </>;
}
