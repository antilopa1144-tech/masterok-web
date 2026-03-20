import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import ReverseCalculator from "./ReverseCalculator";

const META = {
  title: `Калькулятор «Сколько осталось» — на какую площадь хватит материала | ${SITE_NAME}`,
  description: "Обратный калькулятор: введите сколько материала осталось, узнайте на какую площадь его хватит. Краска, грунтовка, клей, штукатурка, шпаклёвка.",
};

export const metadata: Metadata = buildPageMetadata({
  title: META.title,
  description: META.description,
  url: `${SITE_URL}/instrumenty/skolko-ostalos/`,
});

export default function Page() {
  return (
    <>
      <div className="bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6">
          <Breadcrumbs items={[
            { href: "/", label: "Главная" },
            { href: "/instrumenty/", label: "Инструменты" },
            { label: "Сколько осталось" },
          ]} />
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-4">
            На какую площадь хватит материала?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Введите сколько материала у вас осталось — калькулятор покажет на какую площадь его хватит.
          </p>
        </div>
      </div>
      <div className="page-container py-8">
        <ReverseCalculator />
      </div>
    </>
  );
}
