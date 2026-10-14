import Image from "next/image";
import Link from "next/link";

const previews = [
  {
    slug: "raskladka-plitki",
    title: "Раскладка плитки",
    image: "/images/constructor/bathroom-scene-2026.webp",
    alt: "Ванная в конструкторе Мастерок с плиткой на полу и стенах",
    description: "Спланируйте плитку на полу и стенах. Проверьте швы, подрезки и количество материала.",
    example: "Пример: ванная 2,5 × 2,8 м, плитка на полу и стенах",
  },
  {
    slug: "raskladka-laminata",
    title: "Раскладка ламината",
    image: "/images/constructor/room-scene-2026.webp",
    alt: "Комната 3 на 4 метра с ламинатом и мебелью в конструкторе Мастерок",
    description: "Сравните направление досок и смещение рядов. Посмотрите подрезки и количество материала для своей комнаты.",
    example: "Пример: комната 3 × 4 м, доска 1285 × 192 мм",
  },
] as const;

/** Static captures of real tools: no calculator engines or additional client JS on home. */
export default function ToolPreviews() {
  return (
    <section className="mt-12" aria-labelledby="tool-previews-title">
      <h2 id="tool-previews-title" className="text-xl font-bold text-slate-950 dark:text-white">Посмотрите раскладку до покупки</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Реальные примеры из конструктора. Выберите покрытие и задайте свои размеры.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {previews.map(preview => (
          <Link key={preview.slug} href={`/instrumenty/${preview.slug}/`} prefetch={false} className="group min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white no-underline transition-colors hover:border-accent-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-600 dark:border-slate-700 dark:bg-slate-900">
            <div className="relative aspect-[16/10] bg-[#edece8]">
              <Image src={preview.image} alt={preview.alt} fill sizes="(min-width: 1280px) 600px, (min-width: 640px) 50vw, 100vw" loading="lazy" className="object-contain" />
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-slate-950 group-hover:text-accent-700 dark:text-white dark:group-hover:text-accent-300">{preview.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{preview.description}</p>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{preview.example}</p>
              <span className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-accent-700 dark:text-accent-300">Настроить свою раскладку →</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
