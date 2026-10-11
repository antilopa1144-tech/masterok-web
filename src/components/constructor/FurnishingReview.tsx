import { ArrowUpRight, Check, TriangleAlert } from "lucide-react";
import type { FurnishingReviewItem } from "@/lib/constructor/furnishing-review";
import styles from "./FurnishingReview.module.css";

const REASONS = { overlap: "Пересечение с предметом", opening: "Условная зона проёма", bounds: "За границей комнаты", height: "Выше потолка" } as const;

export default function FurnishingReview({ items, blocked, onInspect }: {
  items: FurnishingReviewItem[];
  blocked: boolean;
  onInspect: (id: string) => void;
}) {
  return <section className={styles.review} aria-label="Проверка расстановки" tabIndex={-1}>
    <div className={styles.heading}>
      {items.length ? <TriangleAlert size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
      <strong>Проверка расстановки</strong>
    </div>
    <p className={styles.summary} role="status">{items.length ? `Предметов с замечаниями: ${items.length}. Нажмите на нужный.` : "Замечаний к размещённым габаритам нет."}</p>
    {items.length > 0 && <ul className={styles.items}>{items.map((item) => <li key={item.id}>
      <button type="button" aria-label={`Проверить предмет: ${item.name}`} disabled={blocked} onClick={() => onInspect(item.id)}>
        <span><strong>{item.name}</strong><small>{item.omitted ? "Не размещён" : [...new Set(item.issues.map((issue) => REASONS[issue.code]))].join(" · ")}</small></span><ArrowUpRight size={17} aria-hidden="true" />
      </button>
    </li>)}</ul>}
    <p className={styles.note}>Зоны у дверей и окон условные. Открывание, подключения и монтажные зазоры нужно проверить отдельно.</p>
  </section>;
}
