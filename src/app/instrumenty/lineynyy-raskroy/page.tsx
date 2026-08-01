import type { Metadata } from "next";
import Link from "next/link";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import LinearCutPlanner from "./LinearCutPlanner";

const description =
  "Рассчитайте линейный раскрой профильной трубы, профиля, доски, бруса и плинтуса: карты реза, количество заготовок, пропил и остатки.";

export const metadata: Metadata = buildToolPageMetadata("lineynyy-raskroy", { description });

export default function Page() {
  return (
    <VisualToolPageShell
      slug="lineynyy-raskroy"
      breadcrumb="Линейный раскрой"
      title="Калькулятор линейного раскроя онлайн"
      description={description}
      accentClass="from-violet-50"
    >
      <LinearCutPlanner />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Что считает калькулятор раскроя
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Инструмент подходит для одномерного раскроя профильной трубы, металлического и монтажного
            профиля, доски, бруса, рейки, плинтуса, наличника и других длинномерных материалов. Укажите
            длину покупной заготовки, размеры деталей и их количество — калькулятор распределит отрезки
            по заготовкам и построит карту каждого реза.
          </p>
          <p>
            В результате отдельно показаны чистая длина деталей, количество и общая длина заготовок к
            покупке, ширина пропила, суммарный остаток и остатки, которые стоит сохранить. Припуск на
            торцовку, дефекты и совмещение рисунка добавляйте к длине соответствующей детали заранее.
          </p>
          <p>
            Для ДСП, фанеры, OSB и других листовых материалов нужен двумерный расчёт. Используйте{" "}
            <Link
              href="/instrumenty/raskladka-listov/"
              className="font-medium text-violet-700 hover:underline dark:text-violet-300"
            >
              раскладку деталей на листе
            </Link>
            , где учитываются длина и ширина деталей.
          </p>
        </div>
      </section>
    </VisualToolPageShell>
  );
}
