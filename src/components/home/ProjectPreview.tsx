"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, House } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { scenarioHref } from "@/lib/constructor/entry";
import styles from "./ProjectPreview.module.css";

// Values transcribed from the real editor captures, not a second calculation engine.
const examples = {
  room: { title: "Комната", size: "3 × 4 м", finish: "Натуральный дуб", texture: "/images/laminate-textures/natural-oak.webp", alt: "Комната в редакторе Мастерок: ламинат, диван и стол", facts: [["12 м²", "Площадь комнаты"], ["54", "Доски по раскрою"], ["8 упак.", "Ламинат к покупке"]] },
  bathroom: { title: "Ванная", size: "2,5 × 2,8 м", finish: "Бежевый камень", texture: "/images/tile-textures/limestone.webp", alt: "Ванная в редакторе Мастерок: плитка, ванна, раковина и стиральная машина", facts: [["7 м²", "Площадь пола"], ["7 упак.", "Плитка на пол"], ["28 упак.", "Плитка на стены"]] },
} as const;

/** Lightweight example switcher; the interactive 3D editor opens through the link. */
export default function ProjectPreview({ bathroom = false }: { bathroom?: boolean }) {
  const [selected, setSelected] = useState<keyof typeof examples>(bathroom ? "bathroom" : "room");
  const example = examples[selected];
  return <div className={styles.project}>
    <div className={styles.toolbar}>
      <div className={styles.switcher} role="group" aria-label="Помещение в примере">
        <button type="button" aria-pressed={selected === "room"} onClick={() => setSelected("room")}><House size={16} aria-hidden="true" />Комната</button>
        <button type="button" aria-pressed={selected === "bathroom"} onClick={() => setSelected("bathroom")}><Bath size={16} aria-hidden="true" />Ванная</button>
      </div>
      <span className={styles.dimensions}>{example.size}</span>
    </div>
    <figure className={styles.scene} data-example={selected}>
      <Image src={`/images/constructor/${selected}-scene-2026.webp`} alt={example.alt} fill priority loading="eager" sizes="(min-width: 1440px) 760px, (min-width: 901px) 58vw, 100vw" />
      <figcaption className={styles.material}><Image src={example.texture} alt="" width={30} height={38} /><span>Отделка в примере<strong>{example.finish}</strong></span></figcaption>
      <span className={styles.viewLabel}>Вид из редактора</span>
    </figure>
    <div className={styles.result} aria-live="polite" aria-atomic="true">
      <div className={styles.resultHeading}><span>Фрагмент расчёта</span><span>{example.title}</span></div>
      <dl>{example.facts.map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className={styles.resultFooter}><span>При настройках этого примера</span><Link href={scenarioHref(selected)} onClick={() => trackEvent("constructor_entry", { placement: bathroom ? "landing_primary" : "home_preview", scenario: selected })} prefetch={false}>Открыть пример<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    </div>
  </div>;
}
