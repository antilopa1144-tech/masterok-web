"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowUpRight, Box, ChevronRight } from "lucide-react";
import { scenarioHref } from "@/lib/constructor/entry";
import { classicLayoutHref, type LayoutMaterial } from "@/lib/constructor/layout-entry";
import styles from "./layout-entry.module.css";

const loading = () => <p role="status" className={styles.loading}>Открываем схему…</p>;
const LaminateLayout = dynamic(() => import("@/app/instrumenty/raskladka-laminata/LaminateLayoutGenerator"), { loading });
const TileLayout = dynamic(() => import("@/app/instrumenty/raskladka-plitki/TileLayoutGenerator"), { loading });

export default function LayoutConstructorEntry({ material, classic = false }: { material: LayoutMaterial; classic?: boolean }) {
  const laminate = material === "laminate";
  if (classic) return laminate ? <LaminateLayout /> : <TileLayout />;

  return <section className={styles.entry} aria-label="Раскладка в 3D-конструкторе">
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.kicker}><Box size={19} /> Конструктор Мастерок</p>
        <h2>{laminate ? "Примерьте ламинат прямо в комнате" : "Разложите плитку прямо в комнате"}</h2>
        <p className={styles.description}>{laminate
          ? "Задайте размеры, выберите доску и направление. Сразу увидите пол в 3D и количество упаковок."
          : "Задайте размеры, выберите плитку и шов. Сразу увидите рисунок, крайние подрезки и количество упаковок."}</p>
        <Link href={scenarioHref(laminate ? "laminate" : "tile")} prefetch={false} className={styles.primary}>Начать в 3D <ArrowUpRight size={20} /></Link>
        {!laminate && <Link href={scenarioHref("bathroom")} prefetch={false} className={styles.bathroom}>Нужны пол и стены ванной? <ChevronRight size={17} /></Link>}
        <p className={styles.note}>Бесплатно, без регистрации. Новый проект сохранится в этом браузере.</p>
      </div>
      <figure className={styles.preview}>
        <div className={laminate ? undefined : styles.floorFrame}>
          <Image src={laminate ? "/images/constructor/room-editor.jpg" : "/images/constructor/tile-floor-preview.png"} alt={laminate ? "Комната с раскладкой ламината в 3D-конструкторе" : "Раскладка плитки на полу в 3D-конструкторе"} width={laminate ? 1274 : 1600} height={laminate ? 717 : 1400} priority sizes="(max-width: 760px) 100vw, 60vw" />
        </div>
        <figcaption>Размеры <ChevronRight size={14} /> Материал <ChevronRight size={14} /> Ведомость</figcaption>
      </figure>
    </div>
    <div className={styles.classic}>
      <div><h3>{laminate ? "Нужна ёлочка?" : "Нужна диагональ или отдельная стена?"}</h3><p>{laminate ? "Эти схемы доступны в прежнем инструменте." : "Расширенные настройки и сохранённые раскладки доступны в прежнем инструменте."}</p></div>
      <Link href={classicLayoutHref(material)} prefetch={false}>Открыть прежний инструмент <ArrowUpRight size={17} /></Link>
    </div>
  </section>;
}
