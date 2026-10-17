import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ConstructorRoom, PurchaseLine } from "@/lib/constructor/core";
import { hasMixedPurchasePrices, searchPurchases, type PurchaseScope } from "@/lib/constructor/purchase-search";
import styles from "./constructor.module.css";

export default function PurchaseList({ lines, rooms, renderLine, actions }: {
  lines: readonly PurchaseLine[];
  rooms: readonly ConstructorRoom[];
  renderLine: (line: PurchaseLine) => ReactNode;
  actions: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<PurchaseScope>("all");
  const id = useId();
  const visible = searchPurchases(lines, rooms, query, scope);
  const unpricedCount = lines.filter(line => !(line.unitPriceRub > 0)).length;
  const mixedPriceCount = lines.filter(hasMixedPurchasePrices).length;
  const filtered = Boolean(query.trim()) || scope !== "all";
  const filterLabel = scope === "unpriced" ? "Без цены" : scope === "mixed-price" ? "Разные цены" : "Поиск";
  return <>
    {lines.length > 0 && <div className={styles.purchaseFilter} role="group" aria-label="Фильтр по цене">
      <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>Все позиции · {lines.length}</button>
      <button type="button" aria-pressed={scope === "unpriced"} onClick={() => setScope("unpriced")}>Без цены · {unpricedCount}</button>
      {(mixedPriceCount > 0 || scope === "mixed-price") && <button type="button" aria-pressed={scope === "mixed-price"} onClick={() => setScope("mixed-price")}>Разные цены · {mixedPriceCount}</button>}
    </div>}
    <details className={styles.purchaseTools}>
      <summary>Найти или отправить список{filtered && <small>{scope === "all" ? "Поиск применён" : filterLabel}: {visible.length} из {lines.length}</small>}</summary>
      {actions}
    {lines.length > 1 && <div className={styles.purchaseSearch}>
      <label htmlFor={id}>Найти материал</label>
      <div><input id={id} type="search" value={query} maxLength={120} placeholder="Название, формат или помещение" aria-describedby={`${id}-hint`} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" className={styles.secondaryButton} onClick={() => setQuery("")}>Сбросить поиск</button>}
      </div>
      <p id={`${id}-hint`}>Поиск и фильтр меняют только список на экране. Количества, общая стоимость, отправка, копирование, PDF и XLSX относятся ко всему проекту.</p>
      <p role="status" aria-live="polite">Показано позиций: {visible.length} из {lines.length}</p>
    </div>}
    </details>
    {filtered && <div className={styles.purchaseFilterNotice}>
      <p role="status">{filterLabel}: показано {visible.length} из {lines.length}. Итог и файлы — для всего проекта.</p>
      {scope === "mixed-price" && <p>Для оценки взята максимальная цена. Сверьте цены связанных поверхностей или помещений через «Изменить материал, упаковку или цену».</p>}
      <button type="button" className={styles.secondaryButton} onClick={() => { setQuery(""); setScope("all"); }}>Показать все материалы</button>
    </div>}
    {visible.length ? <div className={styles.purchaseList}>{visible.map(renderLine)}</div> : <p className={styles.purchaseIntro}>{scope === "unpriced" ? "Позиций без цены по этим условиям не найдено. Выберите «Все позиции» или сбросьте поиск." : scope === "mixed-price" ? "Позиций с разными ценами по этим условиям не найдено. Выберите «Все позиции» или сбросьте поиск." : "Материалы не найдены. Попробуйте другое название, размер или сбросьте поиск."}</p>}
    {rooms.some(room => room.interior?.type === "bathroom") && <aside className={styles.purchaseGuide} aria-label="Проверка закупки ванной">
      <strong>Перед заказом материалов</strong>
      <p>Сверьте фасовку, цены и состав заказа. Памятки откроются в новой вкладке; ведомость останется здесь.</p>
      <Link href="/instrumenty/chek-listy/zakupka-materialov-vannoy/" target="_blank" rel="noopener noreferrer">Чек-лист закупки ванной <span>(новая вкладка)</span></Link>
      <Link href="/konstruktor/vannaya/materialy/" target="_blank" rel="noopener noreferrer">Что проверить в ведомости <span>(новая вкладка)</span></Link>
      <Link href="/instrumenty/chek-listy/priemka-plitki/" target="_blank" rel="noopener noreferrer">Приёмка плитки после доставки <span>(новая вкладка)</span></Link>
    </aside>}
  </>;
}
