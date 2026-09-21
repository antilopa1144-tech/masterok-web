import type { Metadata } from "next";
import Link from "next/link";
import VisualToolPageShell from "@/components/tools/VisualToolPageShell";
import { getToolConfig } from "@/lib/tools/config";
import { buildToolPageMetadata } from "@/lib/tools/metadata";
import LinearCutPlanner from "./LinearCutPlanner";

const tool = getToolConfig("lineynyy-raskroy")!;

export const metadata: Metadata = buildToolPageMetadata("lineynyy-raskroy");

export default function Page() {
  return (
    <VisualToolPageShell
      slug="lineynyy-raskroy"
      breadcrumb="Линейный раскрой"
      title={tool.title}
      description={tool.description}
      accentClass="from-violet-50"
    >
      <LinearCutPlanner />

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Как рассчитать раскрой профильной трубы
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <p>
            Укажите стандартную длину хлыста, ширину пропила, длину каждой детали и количество. Калькулятор
            распределит отрезки профильной трубы или профиля по целым заготовкам и построит карту каждого
            реза. Для торцовки заводского края и других технологических припусков увеличьте длину нужной
            детали по своему чертежу или карте работ.
          </p>
          <p>
            В результате отдельно показаны чистая длина деталей, количество и общая длина заготовок к
            покупке, ширина пропила, суммарный остаток и остатки, которые стоит сохранить. Припуск на
            дефекты и совмещение рисунка добавляйте к длине соответствующей детали заранее. Инструмент не
            моделирует угол реза, ориентацию сечения, сварочный зазор и порядок сборки узла.
          </p>
          <p>
            Та же одномерная схема подходит для доски, бруса, рейки, плинтуса, наличника и других
            материалов, которые режут только по длине.
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
