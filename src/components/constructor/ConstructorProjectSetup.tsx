"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Box, Ruler, ShoppingCart } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { CONSTRUCTOR_URL, type ConstructorScenario } from "@/lib/constructor/entry";
import type { ConstructorProject, ConstructorRoom } from "@/lib/constructor/core";
import { createScenarioWorkspace } from "@/lib/constructor/scenarios";
import { createProjectFromRoom } from "@/lib/constructor/project-creation";
import type { ConstructorWorkspace } from "@/lib/constructor/workspace";
import RoomCreationForm from "./RoomCreationForm";
import common from "./constructor.module.css";
import styles from "./ConstructorProjectSetup.module.css";

type SetupProps = {
  scenario?: ConstructorScenario;
  onCreate: (workspace: ConstructorWorkspace, baseline: ConstructorProject, scenario?: ConstructorScenario) => void;
  onCancel: () => void;
};

export default function ConstructorProjectSetup({ scenario, onCreate, onCancel }: SetupProps) {
  const [template] = useState(() => createScenarioWorkspace(scenario ?? "room"));
  const create = (room: ConstructorRoom): string | undefined => {
    let next: ConstructorWorkspace;
    try { next = createProjectFromRoom(template, room); }
    catch (error) { return error instanceof Error ? error.message : "Не удалось создать проект. Проверьте размеры."; }
    // Compare confirmed values with the starting example, including a room whose type was changed.
    const baseline = { ...template.project, rooms: [{ ...template.project.rooms[0], id: room.id }] };
    onCreate(next, baseline, scenario);
  };
  return <RoomCreationForm existingNames={[]} blocked={false} initialRoom={template.project.rooms[0]} initialStep={scenario ? "dimensions" : "type"} intent="project" onCreate={create} onCancel={onCancel} />;
}

export function ConstructorProjectSetupScreen(props: SetupProps) {
  return <section className={`${common.workspace} ${styles.screen}`} aria-label="Создание проекта конструктора">
    <header className={styles.header}>
      <Link href={CONSTRUCTOR_URL} className={common.brand}><span className={common.brandMark}>М</span><span>Мастерок</span></Link>
      <Link href={`${CONSTRUCTOR_URL}#scenarios`} className={styles.back}><ArrowLeft size={17} />К примерам</Link>
      <ThemeToggle />
    </header>
    <main className={styles.main}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Конструктор · Новый проект</p>
        <h1>Начнём с вашего помещения.</h1>
        <p className={styles.intro}>Выберите тип и задайте размеры. Затем примерьте отделку в 3D и соберите материалы к покупке.</p>
        <ol className={styles.journey}>
          <li><Ruler size={20} /><span><strong>Свои размеры</strong>Ползунки и точный ввод в миллиметрах.</span></li>
          <li><Box size={20} /><span><strong>Отделка в 3D</strong>Плитка, ламинат, швы и подрезки.</span></li>
          <li><ShoppingCart size={20} /><span><strong>Ведомость материалов</strong>Потребность, запас и упаковки к покупке.</span></li>
        </ol>
        <p className={styles.storage}>Проект появится после подтверждения. Сохранение — в этом браузере; для переноса на другое устройство скачайте файл проекта.</p>
      </div>
      <div className={styles.card} aria-label="Первое помещение проекта"><ConstructorProjectSetup {...props} /></div>
    </main>
  </section>;
}
