import type { Metadata } from "next";
import Link from "next/link";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import WallSlatPlanner from "./WallSlatPlanner";

const description = "Рассчитайте количество и погонные метры декоративных реек на стену, получите равные края, точный шаг, схему раскладки и рейки к покупке.";
export const metadata: Metadata = buildToolPageMetadata("raskladka-reek", { description });

export default function Page() {
  return (
    <VisualToolPageShell
      slug="raskladka-reek"
      breadcrumb="Раскладка реек"
      title="Калькулятор реек на стену с визуальной раскладкой"
      description={description}
      accentClass="from-amber-50"
    >
      <WallSlatPlanner />

      <section
        className="mt-8 rounded-2xl border border-amber-200 bg-white p-5 sm:p-6 dark:border-amber-900/50 dark:bg-slate-900"
        aria-labelledby="slat-layout-guide-title"
      >
        <h2 id="slat-layout-guide-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Как рассчитать рейки на стену с равными промежутками
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Сначала измерьте ширину и высоту именно облицовываемого участка. Затем задайте лицевую ширину
            рейки и выберите способ разметки: желаемый зазор или точное количество. В режиме по зазору
            калькулятор сохраняет введённый промежуток и делит оставшееся место поровну между краями стены.
            В режиме по количеству одинаковыми становятся внутренние промежутки и крайние поля.
          </p>

          <div className="rounded-xl bg-amber-50 p-4 text-slate-700 dark:bg-amber-950/20 dark:text-slate-200">
            <h3 className="font-semibold">Пример: стена 3000 × 2700 мм</h3>
            <p className="mt-2">
              При лицевой ширине рейки 30 мм и зазоре 20 мм помещается 60 вертикальных реек. Они занимают
              2980 мм: 60 × 30 мм + 59 × 20 мм. Оставшиеся 20 мм делятся на два равных поля по 10 мм.
              Чистая длина составляет 60 × 2,7 м = 162 пог. м. При хлысте 3 м и закрытом запасе 5%
              предварительный итог — 63 целых хлыста.
            </p>
          </div>

          <p>
            Этот итог предполагает по одному хлысту на каждую вертикаль и отдельно закрывает выбранный
            запас. Чтобы задать реальную ширину пропила и проверить повторное использование обрезков,
            перенесите результат в{" "}
            <Link
              href="/instrumenty/lineynyy-raskroy/"
              className="font-medium text-amber-800 hover:underline dark:text-amber-300"
            >
              калькулятор линейного раскроя
            </Link>
            .
          </p>
          <p>
            Для ПВХ, МДФ, вагонки и широких стеновых элементов используйте{" "}
            <Link
              href="/kalkulyatory/steny/paneli-dlya-sten/"
              className="font-medium text-amber-800 hover:underline dark:text-amber-300"
            >
              калькулятор панелей для стен
            </Link>
            . Он оценивает панели, клей или обрешётку по площади, но не строит декоративный ритм реек.
          </p>
        </div>
      </section>
    </VisualToolPageShell>
  );
}
