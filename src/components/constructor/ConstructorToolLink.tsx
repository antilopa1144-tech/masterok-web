import Link from "next/link";
import { Box, ArrowUpRight } from "lucide-react";
import { scenarioHref } from "@/lib/constructor/entry";

export default function ConstructorToolLink({ material }: { material: "laminate" | "tile" }) {
  return <aside className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900 dark:bg-orange-950/20" aria-label="Попробовать конструктор комнаты">
    <Box className="shrink-0 text-orange-700 dark:text-orange-400" size={22} />
    <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{material === "tile" ? "Плитка во всей ванной — в одном проекте" : "Посмотрите ламинат в своей комнате"}</p><p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{material === "tile" ? "Пол, стены, проёмы, 3D и развёртки." : "3D, проёмы, варианты отделки и упаковки к покупке."} Откроется новый пример; размеры задаются в редакторе.</p></div>
    <Link href={scenarioHref(material === "tile" ? "bathroom" : "laminate")} prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-800 no-underline hover:underline dark:text-orange-300">Открыть в конструкторе<ArrowUpRight size={17} /></Link>
  </aside>;
}
