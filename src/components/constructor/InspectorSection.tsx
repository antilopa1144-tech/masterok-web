import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./constructor.module.css";

export default function InspectorSection({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return <details className={`${styles.details} ${styles.inspectorSection}`}>
    <summary aria-label={title}><span><strong>{title}</strong><small>{value}</small></span><ChevronDown size={17} aria-hidden="true" /></summary>
    <div className={styles.detailsContent}>{children}</div>
  </details>;
}
