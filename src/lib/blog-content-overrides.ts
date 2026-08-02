import type { BlogPost } from "./blog";

const PROFNASTIL_FENCE_SLUG = "skolko-proflista-na-zabor";
const WRONG_CALCULATOR_URL = "https://getmasterok.ru/kalkulyatory/krovlya/krovlya/";
const FENCE_CALCULATOR_URL = "/kalkulyatory/fasad/zabor/";
const QUICK_ANSWER_ID = "skolko-listov-20-30-50";

const QUICK_ANSWER_HTML = `
<h2 id="${QUICK_ANSWER_ID}">Сколько листов нужно на забор 20, 30 и 50 метров</h2>
<p>Быстрый расчёт ниже сделан для сплошного прямого участка без ворот и калитки. Используется рабочая, а не габаритная ширина листа; количество округлено вверх до целого листа.</p>
<table>
  <thead>
    <tr><th>Длина забора</th><th>С8, рабочая ширина 1,15 м</th><th>С21, рабочая ширина 1,00 м</th></tr>
  </thead>
  <tbody>
    <tr><td>20 м</td><td>18 листов</td><td>20 листов</td></tr>
    <tr><td>30 м</td><td>27 листов</td><td>30 листов</td></tr>
    <tr><td>50 м</td><td>44 листа</td><td>50 листов</td></tr>
  </tbody>
</table>
<p><strong>Важно:</strong> это базовая потребность без дополнительного запаса. Если ворота и калитка входят в общую длину, сначала вычтите ширину проёмов. Рабочую ширину конкретного профлиста возьмите из карточки или паспорта производителя: у разных профилей она отличается.</p>
<p><a href="${FENCE_CALCULATOR_URL}">Рассчитать профлист, столбы, лаги и крепёж в калькуляторе забора</a></p>
`.trim();

function migrateProfnastilFenceHtml(html: string): string {
  let next = html.split(WRONG_CALCULATOR_URL).join(FENCE_CALCULATOR_URL);
  if (next.includes(`id="${QUICK_ANSWER_ID}"`)) return next;

  const firstHeading = next.search(/<h2(?:\s[^>]*)?>/i);
  if (firstHeading < 0) return `${QUICK_ANSWER_HTML}\n${next}`;
  return `${next.slice(0, firstHeading)}${QUICK_ANSWER_HTML}\n${next.slice(firstHeading)}`;
}

/**
 * Временные проверяемые правки Ghost-контента. Они позволяют выпустить
 * исправление вместе с кодом, даже если Admin API недоступен при релизе.
 * После применения соответствующей миграции функция остаётся идемпотентной.
 */
export function applyBlogContentOverrides(post: BlogPost): BlogPost {
  if (post.slug !== PROFNASTIL_FENCE_SLUG) return post;

  return {
    ...post,
    title: "Сколько профлиста нужно на забор 20, 30 и 50 м",
    metaTitle: "Сколько профлиста на забор 20, 30 и 50 м — таблица",
    description:
      "Сколько листов профнастила нужно на забор 20, 30 или 50 м: таблица для С8 и С21, формула по рабочей ширине, учёт ворот и калитки.",
    updatedAt: "2026-08-02",
    content: migrateProfnastilFenceHtml(post.content),
  };
}
