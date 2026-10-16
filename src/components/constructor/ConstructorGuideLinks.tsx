import Link from "next/link";
import { ArrowUpRight, Bath, Box, Ruler, Sofa } from "lucide-react";
import { CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_FURNITURE_URL, CONSTRUCTOR_PLAN_URL, CONSTRUCTOR_URL } from "@/lib/constructor/entry";
import styles from "./ConstructorGuideLinks.module.css";

const guides = [
  { href: CONSTRUCTOR_PLAN_URL, title: "План комнаты с размерами", text: "Замеры, двери и окна, вид сверху и сохранение плана.", icon: Ruler },
  { href: CONSTRUCTOR_FURNITURE_URL, title: "Расстановка мебели", text: "Габариты предметов, перемещение и сравнение вариантов.", icon: Sofa },
  { href: CONSTRUCTOR_BATHROOM_URL, title: "Планировка ванной", text: "Сантехника, плитка на стенах и полу, ведомость отделки.", icon: Bath },
  { href: CONSTRUCTOR_URL, title: "3D-конструктор и материалы", text: "От помещения до раскладки и целых упаковок к покупке.", icon: Box },
];

/** Ordinary server-rendered links connect search entry pages without loading the editor. */
export default function ConstructorGuideLinks({ current }: { current?: string }) {
  return <nav className={styles.guides} aria-label="Планирование ремонта">
    <p className={styles.heading}>Что хотите спланировать?</p>
    <div className={styles.grid}>{guides.filter(guide => guide.href !== current).map(({ href, title, text, icon: Icon }) =>
      <Link href={href} key={href} prefetch={false} className={styles.card}>
        <Icon size={21} aria-hidden="true" />
        <span><strong>{title}</strong><span>{text}</span></span>
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>,
    )}</div>
  </nav>;
}
