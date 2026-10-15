import type { ConstructorRoom, PurchaseLine } from "@/lib/constructor/core";
import { ChevronDown } from "lucide-react";
import { purchaseTargets, type PurchaseTarget } from "@/lib/constructor/purchase-targets";
import styles from "./constructor.module.css";

export default function PurchaseMaterialLinks({ line, rooms, onSelect, disabled }: {
  line: PurchaseLine;
  rooms: readonly ConstructorRoom[];
  onSelect: (target: PurchaseTarget) => void;
  disabled: boolean;
}) {
  const targets = purchaseTargets(line, rooms);
  if (!targets.length) return null;
  return <details className={`${styles.purchaseDetails} ${styles.purchaseSources}`}>
    <summary><ChevronDown size={16} aria-hidden="true" />Изменить материал, упаковку или цену</summary>
    <div className={styles.purchaseDetailsBody}>
      <p className={styles.hint}>{targets.length > 1 && "Выберите помещение и поверхность. "}{line.kind === "tile-adhesive" || line.kind === "tile-grout" ? "Расход и цену смеси можно уточнить в разделе «Клей и затирка»." : "Фасовка и цена находятся в разделе «Упаковка и стоимость»."}</p>
      {targets.map(target => <button type="button" key={`${target.roomId}:${target.wall ?? "floor"}`} className={styles.secondaryButton} disabled={disabled} onClick={() => onSelect(target)}>{target.label}</button>)}
    </div>
  </details>;
}
