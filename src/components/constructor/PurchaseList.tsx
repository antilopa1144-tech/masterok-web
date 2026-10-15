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
  const id = useId();
  const visible = searchPurchases(lines, rooms, query);
  return <>
    <details className={styles.purchaseTools}>
      <summary>Найти или скопировать список{query.trim() && <small>Поиск применён: {visible.length} из {lines.length}</small>}</summary>
      {actions}
    {lines.length > 1 && <div className={styles.purchaseSearch}>
      <label htmlFor={id}>Найти материал</label>
      <div><input id={id} type="search" value={query} maxLength={120} placeholder="Название, формат или помещение" aria-describedby={`${id}-hint`} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" className={styles.secondaryButton} onClick={() => setQuery("")}>Сбросить поиск</button>}
      </div>
      <p id={`${id}-hint`}>Поиск меняет только список на экране. Количества, общая стоимость, PDF и XLSX относятся ко всему проекту.</p>
      <p role="status" aria-live="polite">Показано позиций: {visible.length} из {lines.length}</p>
    </div>}
    </details>
    {visible.length ? <div className={styles.purchaseList}>{visible.map(renderLine)}</div> : <p className={styles.purchaseIntro}>Материалы не найдены. Попробуйте другое название, размер или сбросьте поиск.</p>}
  </>;
}
