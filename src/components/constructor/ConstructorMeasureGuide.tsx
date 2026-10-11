import { Ruler } from "lucide-react";
import styles from "./constructor-entry.module.css";

/** Server-rendered help, available before opening the JavaScript editor. */
export default function ConstructorMeasureGuide({ bathroom = false }: { bathroom?: boolean }) {
  return <section id="constructor-measurements" className={`${styles.section} ${styles.workflow}`} aria-labelledby="measurements-title">
    <div><h2 id="measurements-title">Какие размеры<br /> подготовить</h2><p className={styles.intro}>Для первого помещения нужны ширина, длина и высота. Остальные параметры можно добавить уже в редакторе.</p><p className={styles.toolsNote}><Ruler size={16} aria-hidden="true" /> Все размеры вводятся в миллиметрах: например, 2,45 м — это 2450 мм. Ширина и длина относятся к двум соседним стенам прямоугольного помещения.</p></div>
    <ol className={styles.steps}>
      <li><span>1</span><div><h3>Помещение изнутри</h3><p>Измерьте расстояния между противоположными стенами и высоту от пола до потолка. Если стены заметно неровные, проверьте размеры в нескольких местах. Редактор строит прямоугольную модель и не учитывает перепады поверхности.</p></div></li>
      <li><span>2</span><div><h3>Двери и окна</h3><p>Запишите ширину и высоту каждого проёма, расстояние до него от угла стены, а для окна — высоту подоконника. В редакторе выберите нужную стену и сверьте положение проёма на плане.</p></div></li>
      <li><span>3</span><div><h3>{bathroom ? "Сантехника и выбранная плитка" : "Обстановка и выбранное покрытие"}</h3><p>{bathroom ? "Для ванны, раковины и стиральной машины пригодятся габариты из карточки товара. Для плитки — её формат, ширина шва и количество в упаковке." : "Для мебели пригодятся ширина, глубина и высота. Для покрытия — размер доски или плитки, фасовка и цена из карточки товара."} Обстановка помогает планировать пространство и не входит в список материалов отделки.</p></div></li>
    </ol>
  </section>;
}
