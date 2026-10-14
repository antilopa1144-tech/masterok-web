import Image from "next/image";
import { Box, Layers, Ruler } from "lucide-react";
import styles from "./ProjectPreview.module.css";

/** Static views captured in the editor: the landing pages do not load Three.js. */
export default function ProjectPreview({ bathroom = false }: { bathroom?: boolean }) {
  return <figure className={styles.project}>
    <div className={styles.heading}><span><Box size={17} aria-hidden="true" />{bathroom ? "Ванная" : "Комната"}</span><span>Пример проекта</span></div>
    <div className={styles.scene}>
      <Image src={`/images/constructor/${bathroom ? "bathroom" : "room"}-scene-2026.webp`} alt={bathroom ? "Ванная из редактора Мастерок: плитка, ванна, раковина и стиральная машина" : "Комната из редактора Мастерок: ламинат, диван и стол, размеры 3 на 4 метра"} fill priority sizes="(min-width: 1440px) 700px, (min-width: 900px) 55vw, 100vw" />
    </div>
    <figcaption className={styles.specification}>
      <div><Ruler size={18} aria-hidden="true" /><span>Помещение<strong>{bathroom ? "2,5 × 2,8 м" : "3 × 4 м"}</strong></span></div>
      <div><Layers size={18} aria-hidden="true" /><span>Отделка<strong>{bathroom ? "Плитка" : "Ламинат"}</strong></span></div>
      <p>Размеры → раскладка → материалы</p>
    </figcaption>
  </figure>;
}
