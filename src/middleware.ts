import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// =============================================================================
// Транслитерация кириллицы → латиница для slug тегов блога.
// Дублирует CYRILLIC_TO_LATIN из src/lib/blog.ts, т.к. middleware работает
// на Edge runtime и не может импортировать модули с Node-зависимостями
// (blog.ts → ghost.ts → fs/process). При изменении карты в одном месте —
// синхронизируй и здесь.
// =============================================================================
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterateTag(tag: string): string {
  return tag
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tag";
}

// Любой символ кириллицы или %D[01]/%D[89A-F] (кириллица в percent-encoding).
const CYRILLIC_OR_ENCODED = /[Ѐ-ӿ]|%D[0-9A-Fa-f]/;

// skipTrailingSlashRedirect: true в next.config.ts отключает встроенные 308-редиректы
// для всех маршрутов. Этот middleware восстанавливает их только для страниц,
// оставляя API-роуты без редиректа (иначе Dart http.Client ломается на POST-редиректе).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API, _next, статика и файлы с расширением — без изменений.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // -------------------------------------------------------------------
  // SEO-фикс: исторические URL тегов блога с кириллицей в slug.
  //
  // Google Search Console прислал письмо про /blog/tag/площадь/ → 404.
  // В текущем коде все теги транслитерируются (tagToSlug в blog.ts),
  // но бот помнит старые URL с давних времён. Без обработки они
  // съедают crawl budget и тянут общую индексацию вниз.
  //
  // Решение: ловим любой /blog/tag/<кириллица>/ и редиректим 301 на
  // транслитерированный slug. Если транслит не даёт валидного тега —
  // Next.js вернёт 404 на следующем шаге, но это уже будет «честный»
  // 404 на одном URL, а не цепочка фантомных.
  // -------------------------------------------------------------------
  if (pathname.startsWith("/blog/tag/") && CYRILLIC_OR_ENCODED.test(pathname)) {
    const tagSegment = pathname.replace(/^\/blog\/tag\//, "").replace(/\/$/, "");
    let decoded: string;
    try {
      decoded = decodeURIComponent(tagSegment);
    } catch {
      decoded = tagSegment;
    }
    const transliterated = transliterateTag(decoded);
    if (transliterated && transliterated !== tagSegment) {
      const url = new URL(request.url);
      url.pathname = `/blog/tag/${transliterated}/`;
      // 301 (permanent) — говорит Google «забудь старый URL и не приходи больше».
      // Это нужно для очистки crawl budget от фантомов.
      return NextResponse.redirect(url.toString(), 301);
    }
  }

  // Страницы без trailing slash → 308 на версию со слэшем.
  if (!pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = `${pathname}/`;
    return NextResponse.redirect(url.toString(), 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
