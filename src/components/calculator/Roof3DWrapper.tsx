"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Roof3D = dynamic(() => import("./Roof3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[4/3] rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center">
      <div className="text-sm text-slate-400 animate-pulse">Загрузка 3D-модели...</div>
    </div>
  ),
});

interface Roof3DWrapperProps {
  spanM: number;
  lengthM: number;
  slopeAngle: number;
  roofType: number;
  overhangM: number;
}

export default function Roof3DWrapper(props: Roof3DWrapperProps) {
  const [visible, setVisible] = useState(false);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-3 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer"
      >
        <span className="text-4xl">🏠</span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Показать 3D-модель кровли</span>
        <span className="text-xs text-slate-400">Вращайте мышкой, зумируйте колёсиком</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Roof3D {...props} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Вращайте мышкой / пальцем. Зум — колёсико / щипок.</p>
        <button
          onClick={() => setVisible(false)}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          Скрыть
        </button>
      </div>
    </div>
  );
}
