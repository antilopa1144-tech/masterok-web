export const calculationFieldClassName =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 aria-invalid:border-red-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100";

export function CalculationDecimalField({
  id, label, value, onChange, hint, error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
}) {
  const description = error ?? hint;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className={calculationFieldClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={description ? `${id}-hint` : undefined}
      />
      {description && (
        <p id={`${id}-hint`} className={error
          ? "mt-1.5 text-sm text-red-700 dark:text-red-300"
          : "mt-1.5 text-sm text-slate-600 dark:text-slate-400"}
        >
          {description}
        </p>
      )}
    </div>
  );
}
