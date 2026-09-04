import type { TileProjectSurfaceView } from "@/lib/tools/tile-layout-project";

type Props = {
  value: TileProjectSurfaceView;
  onChange: (value: TileProjectSurfaceView) => void;
  label: string;
};

export default function TileSurfaceSelector({ value, onChange, label }: Props) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {(["wall", "floor"] as const).map((surface) => (
        <button
          type="button"
          key={surface}
          aria-pressed={value === surface}
          onClick={() => onChange(surface)}
          className={`min-h-11 rounded-lg px-4 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 ${value === surface ? "bg-white text-accent-700 shadow-sm dark:bg-slate-700 dark:text-accent-300" : "text-slate-500 dark:text-slate-400"}`}
        >
          {surface === "wall" ? "Стена" : "Пол"}
        </button>
      ))}
    </div>
  );
}
