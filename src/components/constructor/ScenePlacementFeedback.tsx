import { TriangleAlert } from "lucide-react";
import type { FurnishingIssue } from "@/lib/constructor/interiors";
import styles from "./constructor.module.css";

export default function ScenePlacementFeedback({ issues }: { issues: readonly FurnishingIssue[] }) {
  return <div className={styles.placementFeedback} role="status" aria-label="Проверка положения в 3D" aria-live="polite" aria-atomic="true">
    {issues.length > 0 && <div className={styles.placementWarning}>
      <TriangleAlert size={20} aria-hidden="true" />
      <div><strong>Проверьте положение</strong><p>{issues[0].message}</p>
        {issues.length > 1 && <small>Ещё замечаний: {issues.length - 1}. Все подробности — в параметрах предмета.</small>}
      </div>
    </div>}
  </div>;
}
