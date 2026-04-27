import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import { ALL_TOOLS } from "@/lib/tools";
import { getAllPosts } from "@/lib/blog";
import { SITE_NAME, SITE_URL, SITE_METADATA_DESCRIPTION } from "@/lib/site";

export const dynamic = "force-static";

export async function GET() {
  const posts = await getAllPosts();

  const lines: string[] = [];
  lines.push(`# ${SITE_NAME}`);
  lines.push("");
  lines.push(`> ${SITE_METADATA_DESCRIPTION}`);
  lines.push("");
  lines.push(`Сайт ${SITE_NAME} (${SITE_URL}) — бесплатные онлайн-калькуляторы для расчёта строительных материалов. Расчёты по ГОСТ, СНиП и СП. Все калькуляторы работают без регистрации, без ограничений и полностью на русском языке. Есть мобильное приложение для Android в RuStore.`);
  lines.push("");
  lines.push("## Главные разделы");
  lines.push("");
  lines.push(`- [Главная](${SITE_URL}/): каталог всех калькуляторов`);
  lines.push(`- [Калькуляторы](${SITE_URL}/kalkulyatory/): ${ALL_CALCULATORS_META.length}+ калькуляторов по категориям`);
  lines.push(`- [Блог](${SITE_URL}/blog/): статьи по строительству и ремонту`);
  lines.push(`- [Михалыч](${SITE_URL}/mikhalych/): AI-помощник строителя`);
  lines.push(`- [Инструменты](${SITE_URL}/instrumenty/): конвертеры, сравнения, чек-листы`);
  lines.push(`- [О проекте](${SITE_URL}/o-proekte/): информация о сервисе`);
  lines.push(`- [Приложение](${SITE_URL}/prilozhenie/): мобильное приложение для Android`);
  lines.push("");
  lines.push("## Категории калькуляторов");
  lines.push("");
  for (const cat of CATEGORIES) {
    const count = ALL_CALCULATORS_META.filter((c) => c.category === cat.id).length;
    lines.push(`- [${cat.label}](${SITE_URL}/kalkulyatory/${cat.slug}/): ${count} калькуляторов`);
  }
  lines.push("");
  lines.push("## Популярные калькуляторы");
  lines.push("");
  const popular = [...ALL_CALCULATORS_META].sort((a, b) => b.popularity - a.popularity).slice(0, 15);
  for (const calc of popular) {
    lines.push(`- [${calc.title}](${SITE_URL}/kalkulyatory/${calc.categorySlug}/${calc.slug}/): ${calc.description}`);
  }
  lines.push("");
  lines.push("## Инструменты");
  lines.push("");
  for (const tool of ALL_TOOLS) {
    if (!tool.slug) continue;
    lines.push(`- [${tool.title}](${SITE_URL}/instrumenty/${tool.slug}/): ${tool.description}`);
  }
  lines.push("");
  lines.push("## Последние статьи блога");
  lines.push("");
  for (const post of posts.slice(0, 20)) {
    lines.push(`- [${post.title}](${SITE_URL}/blog/${post.slug}/): ${post.description}`);
  }
  lines.push("");
  lines.push("## Лицензия и использование");
  lines.push("");
  lines.push("Контент сайта можно цитировать с указанием источника. Калькуляторы работают в браузере без отправки данных на сервер. Результаты расчётов носят справочный характер.");
  lines.push("");
  lines.push(`## Контакт`);
  lines.push("");
  lines.push(`Для вопросов по расчётам используйте AI-ассистента Михалыча: ${SITE_URL}/mikhalych/`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
