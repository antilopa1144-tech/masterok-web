import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Download, Move, Ruler, Sofa, TriangleAlert } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ConstructorStartActions from "@/components/constructor/ConstructorStartActions";
import { CONSTRUCTOR_BATHROOM_URL, CONSTRUCTOR_FURNITURE_URL, CONSTRUCTOR_URL, projectStartHref, scenarioHref } from "@/lib/constructor/entry";
import { buildPageMetadata } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import styles from "@/components/constructor/constructor-entry.module.css";

const url = `${SITE_URL}${CONSTRUCTOR_FURNITURE_URL}`;
const description = "Расставьте мебель в комнате онлайн: свои размеры, двери и окна, перемещение и поворот в 3D, проверка пересечений и план. Бесплатно, без регистрации.";

export const metadata: Metadata = buildPageMetadata({
  title: "Расстановка мебели в комнате онлайн в 3D",
  description,
  url,
  image: `${SITE_URL}/images/constructor/room-editor.jpg`,
  imageDimensions: { width: 1274, height: 717 },
});

const questions = [
  { question: "Как начать расстановку по размерам своей комнаты?", answer: "Нажмите «Создать свой проект», выберите тип помещения и задайте название, ширину, длину и высоту в миллиметрах. Если в этом браузере уже есть проект, для новой работы нажмите «Новый проект». После открытия редактора добавьте двери и окна в разделе «Размеры», а в разделе «Обстановка» выберите предметы и задайте их реальные габариты." },
  { question: "Как двигать, поворачивать и копировать мебель?", answer: "Выберите предмет в 3D и нажмите «Двигать». Перетащите его по полу, затем нажмите «Готово». Кнопка «90°» поворачивает предмет, «Копия» создаёт ещё один экземпляр. В параметрах можно точно задать габариты и координаты. Кнопка «Показать предмет на плане» откроет план с выбранным экземпляром. Для точного сдвига выберите шаг 1, 10 или 100 мм и нажимайте кнопки со стрелками. На компьютере стрелки клавиатуры используют выбранный шаг; Shift даёт 100 мм, Alt — 1 мм. Предметы также можно перетаскивать на плане." },
  { question: "Что показывает проверка расстановки?", answer: "В разделе «Обстановка» есть общий список предметов с замечаниями. Он показывает пересечения габаритов, выходы за границы комнаты, превышение высоты потолка, условные зоны у дверей и окон, а также предметы, которым не нашлось места при автоматической расстановке. Нажмите на предмет в списке, чтобы открыть его параметры. Если замечания есть, возле 3D-комнаты и плана появляется кнопка «Замечания» с количеством предметов." },
  { question: "Можно ли спланировать кухню, спальню или ванную?", answer: "Да. Доступны гостиная, спальня, кухня, ванная, кабинет и прихожая со своими наборами условных предметов. Для ванной есть сантехника и стиральная машина, для кухни — гарнитур, холодильник и стол. Можно убрать лишние предметы, изменить их размеры и добавить копии. Это габаритные модели, а не каталог конкретных товаров." },
  { question: "Можно ли считать отсутствие замечаний готовым проектом для ремонта?", answer: "Нет. Проверка относится к габаритам прямоугольной модели. Она не рассчитывает открывание дверей и фасадов, подключения техники, монтажные зазоры и удобство реальных проходов. Зоны у проёмов условные. Эти параметры нужно проверить по выбранным товарам и на месте. Ниши, короба и сложный контур комнаты редактор пока не поддерживает." },
  { question: "Как сохранить расстановку и передать её на другое устройство?", answer: "Проект автоматически сохраняется в текущем браузере. Для переноса скачайте файл .masterok.json через меню «Экспорт», передайте его на другое устройство и откройте через «Открыть файл проекта» на стартовой странице. Для просмотра можно скачать план в PNG или PDF. Адрес редактора сам по себе не передаёт сохранённую расстановку на другое устройство." },
];

export default function FurnitureConstructorPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Конструктор комнаты", item: `${SITE_URL}${CONSTRUCTOR_URL}` },
      { "@type": "ListItem", position: 3, name: "Расстановка мебели", item: url },
    ],
  };
  return <div className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    <div className={styles.breadcrumbs}><Breadcrumbs items={[{ label: "Конструктор", href: CONSTRUCTOR_URL }, { label: "Расстановка мебели" }]} /></div>
    <section className={`${styles.hero} ${styles.scenarioHero}`} aria-labelledby="furniture-title">
      <div className={styles.heroCopy}>
        <p className={styles.productName}><Sofa size={20} />Конструктор Мастерок</p>
        <h1 id="furniture-title">Расстановка мебели<br /> в вашей комнате.</h1>
        <p className={styles.intro}>Создайте комнату по своим размерам, добавьте двери и окна, передвиньте мебель в 3D. Проверьте положение предметов на плане до покупки.</p>
        <ConstructorStartActions />
      </div>
      <figure className={styles.heroPreview}>
        <div className={styles.previewLabel}><span><Move size={16} />3D и план</span><span>Свой размер · Поворот · Копии</span></div>
        <Image src="/images/constructor/room-editor.jpg" alt="Прямоугольная гостиная в редакторе Мастерок с диваном, столом и напольным покрытием" width={1274} height={717} priority sizes="(max-width: 900px) 100vw, 65vw" />
        <figcaption><Check size={16} />Положение и габариты предметов сохраняются вместе с комнатой.</figcaption>
      </figure>
    </section>
    <nav className={styles.pageNav} aria-label="О расстановке мебели"><a href="#furniture-steps">Как расставить</a><a href="#placement-checks">Что проверяется</a><a href="#scenarios">Готовые примеры</a><a href="#furniture-questions">Вопросы</a></nav>
    <section className={`${styles.section} ${styles.workflow}`} aria-labelledby="furniture-steps">
      <div><h2 id="furniture-steps">От замеров<br /> до расстановки</h2><p className={styles.intro}>Сначала задайте помещение, затем проверьте выбранную мебель в его масштабе.</p><p className={styles.toolsNote}><Ruler size={16} aria-hidden="true" /> Все размеры вводятся в миллиметрах. Для мебели нужны габариты из карточки товара, для комплекта со стульями или зеркалом — общий размер.</p></div>
      <ol className={styles.steps}>
        <li><span>1</span><div><h3>Комната, двери и окна</h3><p>Измерьте помещение изнутри. Добавьте каждый проём на нужную стену, укажите ширину, высоту и отступ от угла. Для окна задайте высоту подоконника.</p></div></li>
        <li><span>2</span><div><h3>Предметы по своим размерам</h3><p>Откройте «Обстановка», уберите лишние предметы и задайте реальные ширину, глубину и высоту. Если автоматической расстановке не хватило места, предмет будет в списке замечаний: его можно уменьшить или разместить вручную.</p></div></li>
        <li><span>3</span><div><h3>Двигайте и сравнивайте</h3><p>Выберите предмет в 3D, нажмите «Двигать» и перетащите по полу. В параметрах нажмите «Показать предмет на плане»: выбранный экземпляр подсветится. Для точного сдвига выберите шаг 1, 10 или 100 мм и нажмите стрелку. Действие можно отменить, а удачные варианты — сохранить для сравнения.</p></div></li>
      </ol>
    </section>
    <section className={styles.section} aria-labelledby="placement-checks">
      <div className={styles.sectionHeading}><div><h2 id="placement-checks">Что видно при проверке</h2><p>Общий список замечаний доступен в разделе «Обстановка».</p></div></div>
      <dl className={styles.materialList}>
        <div><dt><Move size={21} />Пересечения габаритов</dt><dd>Если предметы пересекаются, замечание назовёт соседний предмет. Можно открыть параметры любого из них и изменить положение, поворот или размеры.</dd></div>
        <div><dt><Ruler size={21} />Границы комнаты</dt><dd>Сохранённая мебель может выйти за пределы комнаты после изменения её размеров. Проверка покажет такие предметы, а также модели выше потолка.</dd></div>
        <div><dt><TriangleAlert size={21} />Место у проёмов</dt><dd>Предметы в условной зоне двери или окна отмечаются для проверки. Это повод проверить размещение; траекторию створки, проходы и реальные зазоры редактор не рассчитывает.</dd></div>
        <div><dt><Download size={21} />Сохранение результата</dt><dd>Расстановка остаётся в проекте. Скачайте план для просмотра или файл проекта, чтобы продолжить редактирование на другом устройстве.</dd></div>
      </dl>
      <p className={styles.scopeNote}>Обстановка помогает планировать пространство. Форма моделей условная; мебель, техника и сантехника не входят в ведомость материалов отделки и не уменьшают её площадь.</p>
    </section>
    <section className={styles.section} id="scenarios" aria-labelledby="furniture-examples">
      <div className={styles.sectionHeading}><div><h2 id="furniture-examples">Сначала можно попробовать</h2><p>Готовый пример открывается отдельно от сохранённых работ.</p></div></div>
      <div className={styles.quickTools}>
        <Link href={scenarioHref("room")} prefetch={false} className={styles.quickTool}><Sofa size={24} /><h3>Гостиная с мебелью</h3><p>Диван, журнальный стол и растение в прямоугольной комнате.</p></Link>
        <Link href={scenarioHref("bathroom")} prefetch={false} className={styles.quickTool}><Move size={24} /><h3>Ванная с техникой</h3><p>Ванна, раковина, унитаз и стиральная машина.</p></Link>
      </div>
      <p className={styles.toolsNote}>Если планируете санузел, откройте <Link href={CONSTRUCTOR_BATHROOM_URL}>конструктор ванной с расстановкой сантехники и плиткой</Link>. Для количества покрытия и закупки пригодится <Link href={CONSTRUCTOR_URL}>конструктор отделки комнаты</Link>.</p>
    </section>
    <section className={`${styles.section} ${styles.faq}`} aria-labelledby="furniture-questions"><div><h2 id="furniture-questions">Перед расстановкой</h2><p>Сохранение и границы модели.</p></div><div>{questions.map(({ question, answer }) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className={styles.closingAction} aria-label="Начать расстановку мебели"><div><h2>Примерьте мебель в своей комнате</h2><p>Выберите тип помещения и задайте размеры.</p></div><Link href={projectStartHref()} prefetch={false} className={styles.primaryAction}>Создать свой проект <ArrowUpRight size={19} /></Link></section>
  </div>;
}
