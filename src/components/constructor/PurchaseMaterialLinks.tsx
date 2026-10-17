import type { ConstructorRoom, PurchaseLine } from "@/lib/constructor/core";
import { ChevronDown } from "lucide-react";
import { purchaseTargets, type PurchaseTarget, type PurchaseSettingsSection } from "@/lib/constructor/purchase-targets";
import { purchaseSourcePrice } from "@/lib/constructor/purchase-source-price";
import { formatMoney } from "@/lib/constructor/presentation";
import styles from "./constructor.module.css";

export default function PurchaseMaterialLinks({ line, rooms, onSelect, disabled }: {
  line: PurchaseLine;
  rooms: readonly ConstructorRoom[];
  onSelect: (target: PurchaseTarget, section?: PurchaseSettingsSection) => void;
  disabled: boolean;
}) {
  const targets = purchaseTargets(line, rooms);
  const hasPackaging = line.kind === "laminate" || line.kind === "floor-tile" || line.kind === "wall-tile";
  const isMixture = line.kind === "tile-adhesive" || line.kind === "tile-grout";
  if (!targets.length) return null;
  return <details className={`${styles.purchaseDetails} ${styles.purchaseSources}`}>
    <summary><ChevronDown size={16} aria-hidden="true" />Изменить материал, упаковку или цену</summary>
    <div className={styles.purchaseDetailsBody}>
      <p className={styles.hint}>{targets.length > 1 && "Выберите помещение и поверхность. "}{line.kind === "tile-adhesive" || line.kind === "tile-grout" ? "Расход и цену смеси можно уточнить в разделе «Клей и затирка»." : "Кнопка с названием поверхности открывает материал. «Упаковка и цена» сразу открывает фасовку и стоимость."}</p>
      {targets.map(target => {
        const price = purchaseSourcePrice(line, target, rooms);
        return <div key={`${target.roomId}:${target.wall ?? "floor"}`} className={styles.purchaseSourceActions} role="group" aria-label={target.label}>
        <button type="button" className={styles.secondaryButton} disabled={disabled} onClick={() => onSelect(target, isMixture ? "supplies" : undefined)}>{target.label}</button>
        {price !== undefined && <p className={styles.purchaseSourcePrice}>Цена упаковки: <strong>{price > 0 ? formatMoney(price) : "не задана"}</strong></p>}
        {hasPackaging && <button type="button" className={styles.secondaryButton} aria-label={`Упаковка и цена: ${target.label}`} disabled={disabled} onClick={() => onSelect(target, "packaging")}>Упаковка и цена <span aria-hidden="true">→</span></button>}
      </div>; })}
    </div>
  </details>;
}
