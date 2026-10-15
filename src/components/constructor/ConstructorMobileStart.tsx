import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projectStartHref, type ConstructorScenario } from "@/lib/constructor/entry";
import entry from "./constructor-entry.module.css";
import styles from "./ConstructorMobileStart.module.css";

/** Keeps project entry reachable while reading the server-rendered guide. */
export default function ConstructorMobileStart({ scenario, label = "Ваше помещение в 3D", navigationLabel = "Создать проект помещения" }: {
  scenario?: ConstructorScenario;
  label?: string;
  navigationLabel?: string;
}) {
  return <nav className={styles.bar} aria-label={navigationLabel}>
    <span>{label}</span>
    <Link href={projectStartHref(scenario)} prefetch={false} className={entry.primaryAction}>Создать проект<ArrowUpRight size={17} aria-hidden="true" /></Link>
  </nav>;
}
