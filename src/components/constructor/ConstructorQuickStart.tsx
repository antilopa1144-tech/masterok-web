import { X } from "lucide-react";
import styles from "./ConstructorQuickStart.module.css";

export default function ConstructorQuickStart({ active, canOpenResult, onDimensions, onMaterial, onResult, onDismiss }: {
  active: "dimensions" | "material" | undefined;
  canOpenResult: boolean;
  onDimensions: () => void;
  onMaterial: () => void;
  onResult: () => void;
  onDismiss: () => void;
}) {
  return <aside className={styles.guide} aria-label="Первые шаги в конструкторе">
    <div className={styles.heading}><strong>Ваша комната за три шага</strong><p>Начните с размеров своего помещения.</p></div>
    <nav className={styles.steps} aria-label="Путь к списку покупок">
      <button type="button" aria-current={active === "dimensions" ? "step" : undefined} onClick={onDimensions}><span aria-hidden="true">1</span>Размеры</button>
      <button type="button" aria-current={active === "material" ? "step" : undefined} onClick={onMaterial}><span aria-hidden="true">2</span>Покрытие</button>
      <button type="button" disabled={!canOpenResult} onClick={onResult}><span aria-hidden="true">3</span>Ведомость</button>
    </nav>
    <button className={styles.close} type="button" aria-label="Скрыть подсказку первого запуска" onClick={onDismiss}><X size={18} /></button>
  </aside>;
}
