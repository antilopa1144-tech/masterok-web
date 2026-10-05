"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, ArrowUpRight } from "lucide-react";
import { CONSTRUCTOR_EDITOR_URL } from "@/lib/constructor/entry";
import { getLayoutTransferIssue, type ConstructorLayoutInput } from "@/lib/constructor/layout-transfer";

export default function ConstructorToolLink({ input }: { input: ConstructorLayoutInput }) {
  const router = useRouter();
  const descriptionId = useId();
  const busy = useRef(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const issue = getLayoutTransferIssue(input);
  const open = async () => {
    if (busy.current || issue) return;
    busy.current = true; setOpening(true); setError("");
    try {
      const [{ createWorkspaceFromLayout }, { saveWorkspace }] = await Promise.all([
        import("@/lib/constructor/layout-transfer"), import("@/lib/constructor/storage"),
      ]);
      const workspace = await createWorkspaceFromLayout(input);
      await saveWorkspace(workspace);
      router.push(`${CONSTRUCTOR_EDITOR_URL}?project=${encodeURIComponent(workspace.project.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось открыть конструктор. Попробуйте ещё раз.");
      busy.current = false; setOpening(false);
    }
  };
  return <aside className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900 dark:bg-orange-950/20" aria-label="Перенести раскладку в конструктор">
    <Box className="shrink-0 text-orange-700 dark:text-orange-400" size={22} />
    <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Продолжите раскладку пола в 3D</p><p id={descriptionId} className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{issue ?? `Перенесём пол ${input.surfaceW.toLocaleString("ru-RU")} × ${input.surfaceH.toLocaleString("ru-RU")} мм, формат ${input.material === "laminate" ? "доски и направление" : "плитки, шов и запас"} в отдельный проект. Высоту комнаты, монтажные зазоры, декор и фасовку проверьте в редакторе. Количество материалов пересчитается по его правилам раскроя.`}</p></div>
    <button type="button" onClick={() => void open()} disabled={Boolean(issue) || opening} aria-describedby={descriptionId} aria-busy={opening} className="inline-flex min-h-11 items-center gap-2 text-left text-sm font-semibold text-orange-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-300">{opening ? "Открываем проект…" : "Открыть в конструкторе"}<ArrowUpRight size={17} /></button>
    {error && <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">{error}</p>}
  </aside>;
}
