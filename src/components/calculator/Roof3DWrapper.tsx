"use client";

import dynamic from "next/dynamic";
import { useState, Component, type ReactNode, type ErrorInfo } from "react";

const Roof3D = dynamic(() => import("./Roof3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[4/3] rounded-xl bg-sky-50 dark:bg-slate-800 flex items-center justify-center">
      <div className="text-sm text-slate-400 animate-pulse">Загрузка 3D-модели...</div>
    </div>
  ),
});

interface Props {
  spanM: number;
  lengthM: number;
  slopeAngle: number;
  roofType: number;
  overhangM: number;
}

class ErrorBoundary extends Component<{ children: ReactNode; onError: (msg: string) => void }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { this.props.onError(e?.message ?? "unknown"); }
  render() { return this.state.hasError ? null : this.props.children; }
}

export default function Roof3DWrapper(props: Props) {
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="w-full rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">Ошибка загрузки 3D: {error}</p>
      </div>
    );
  }

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="w-full py-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-2 hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer"
      >
        <span className="text-3xl">🏠</span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Показать 3D-модель кровли</span>
        <span className="text-xs text-slate-400">Вращайте мышкой, зумируйте колёсиком</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <ErrorBoundary onError={(msg) => setError(msg)}>
        <Roof3D {...props} />
      </ErrorBoundary>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Вращайте мышкой / пальцем</p>
        <button onClick={() => setVisible(false)} className="text-xs text-slate-400 hover:text-slate-600 underline">Скрыть</button>
      </div>
    </div>
  );
}
