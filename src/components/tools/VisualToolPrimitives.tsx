"use client";

export function ToolNumberInput({ label, value, unit, min, max, step = 1, hint, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; step?: number; hint?: string; onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <input type="number" inputMode="decimal" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="input-field min-w-0 w-full" />
        <span className="text-xs text-slate-400">{unit}</span>
      </span>
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{hint}</span>}
    </label>
  );
}

export function ToolMetric({ value, label, tone = "slate" }: { value: React.ReactNode; label: string; tone?: "slate" | "emerald" | "amber" | "sky" | "violet" }) {
  const colors = { slate: "text-slate-900 dark:text-slate-100", emerald: "text-emerald-700 dark:text-emerald-400", amber: "text-amber-700 dark:text-amber-400", sky: "text-sky-700 dark:text-sky-400", violet: "text-violet-700 dark:text-violet-400" };
  return <div><p className={`text-2xl font-bold ${colors[tone]}`}>{value}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p></div>;
}

export function ToolNotes({ warnings, notes }: { warnings: string[]; notes: string[] }) {
  return (
    <>
      {warnings.length > 0 && <div className="mt-4 space-y-2">{warnings.map((warning) => <p key={warning} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">⚠ {warning}</p>)}</div>}
      <ul className="mt-4 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{notes.map((note) => <li key={note}>{note}</li>)}</ul>
    </>
  );
}

export function ToolPresetButton({ active = false, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${active ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-900/20" : "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-400"}`}>{children}</button>;
}
