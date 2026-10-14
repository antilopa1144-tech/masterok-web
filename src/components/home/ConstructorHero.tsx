import { ArrowRight, Bath, Box, House, Layers } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL, scenarioHref } from "@/lib/constructor/entry";
import ConstructorEntryLink from "@/components/constructor/ConstructorEntryLink";
import ConstructorHomeActions from "./ConstructorHomeActions";
import ProjectPreview from "./ProjectPreview";
import styles from "./ConstructorHero.module.css";

const examples = [
  { id: "room", title: "Комната", detail: "Размеры и отделка", icon: House },
  { id: "bathroom", title: "Ванная", detail: "Плитка и сантехника", icon: Bath },
  { id: "laminate", title: "Ламинат", detail: "Раскладка и подрезки", icon: Layers },
] as const;

/** A real editor capture keeps the homepage independent of the 3D engine. */
export default function ConstructorHero() {
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.overview}>
        <div className={styles.copy}>
          <p className={styles.product}><Box size={22} aria-hidden="true" />Конструктор Мастерок</p>
          <h1 id="home-title">Спланируйте ремонт в 3D.</h1>
          <p className={styles.description}>Задайте размеры комнаты, примерьте плитку или ламинат и получите список материалов к покупке.</p>
          <ConstructorHomeActions />
        </div>
        <ConstructorEntryLink placement="home_preview" href={CONSTRUCTOR_EDITOR_URL} prefetch={false} className={styles.previewLink} aria-label="Открыть 3D-конструктор комнаты"><ProjectPreview /></ConstructorEntryLink>
      </div>
      <div className={styles.examples}>
        <div className={styles.examplesLabel}><h2>Начните с примера</h2><p>Откроется новый проект</p></div>
        <nav className={styles.exampleLinks} aria-label="Примеры для нового проекта">
          {examples.map(({ id, title, detail, icon: Icon }) => (
            <ConstructorEntryLink key={id} placement="home_example" scenario={id} href={scenarioHref(id)} prefetch={false} className={styles.example}>
              <Icon size={24} aria-hidden="true" />
              <span><strong>{title}</strong><small>{detail}</small></span>
              <ArrowRight size={17} aria-hidden="true" className={styles.exampleArrow} />
            </ConstructorEntryLink>
          ))}
        </nav>
      </div>
    </section>
  );
}
