"use client";

import { createTileSupply, tileSupplyArea, type RoomCalculation, type TileSupplies, type TileSupplySpec } from "@/lib/constructor/core";
import { formatNumber } from "@/lib/constructor/presentation";
import { NumberField, TextField, type DraftStatus } from "./DraftFields";
import styles from "./constructor.module.css";

export default function TileSupplyControls({ value, calculation, onChange, onStatus }: {
  value?: TileSupplies; calculation?: RoomCalculation; onChange: (value: TileSupplies) => void; onStatus: DraftStatus;
}) {
  return <details className={styles.details}><summary>Клей и затирка</summary><div className={styles.detailsContent}>
    <p className={styles.hint}>Для плиточного пола и облицованных стен этой комнаты{calculation ? `: ${formatNumber(tileSupplyArea(calculation), 3)} м² укладки` : ""}. Расход в кг/м² возьмите у выбранного производителя для вашего формата, шва и условий нанесения.</p>
    {(["adhesive", "grout"] as const).map((kind) => {
      const spec = value?.[kind], title = kind === "adhesive" ? "клея" : "затирки";
      const update = (field: keyof TileSupplySpec, next: string | number) => onChange({ ...value, [kind]: { ...spec!, [field]: next } });
      const numeric = (field: keyof TileSupplySpec, label: string, min: number, max: number, unit: string) => <NumberField value={spec![field] as number} label={label} min={min} max={max} unit={unit} onStatus={onStatus} onCommit={(next) => update(field, next)} />;
      return <div key={kind} className={styles.propertySection}>
        <label className={styles.checkbox}><input type="checkbox" checked={!!spec} onChange={(event) => {
          const next = { ...value }; if (event.target.checked) next[kind] = createTileSupply(kind); else delete next[kind]; onChange(next);
        }} /><span>Добавить {kind === "adhesive" ? "клей" : "затирку"}</span></label>
        {spec && <>
          <TextField label={`Товар или артикул ${title}`} value={spec.materialKey} onStatus={onStatus} onCommit={(next) => update("materialKey", next)} />
          <div className={styles.fieldRow}>{numeric("consumptionKgM2", `Расход ${title}`, 0, 100, "кг/м²")}{numeric("reservePercent", `Дополнительный запас ${title}`, 0, 100, "%")}</div>
          <div className={styles.fieldRow}>{numeric("packageKg", `Масса упаковки ${title}`, .1, 100, "кг")}{numeric("packagePriceRub", `Цена упаковки ${title}`, 0, 10000000, "₽")}</div>
          {spec.consumptionKgM2 === 0 && <p className={styles.formNotice} role="status">Укажите расход {title}. Пока он равен нулю, смесь не включена в закупку.</p>}
        </>}
      </div>;
    })}
    <p className={styles.hint}>Дополнительный запас применяется один раз, затем общая масса округляется до целых упаковок. Если расход производителя уже включает потери, оставьте дополнительный запас 0%. Грунтовка, гидроизоляция и герметик здесь не рассчитаны.</p>
  </div></details>;
}
