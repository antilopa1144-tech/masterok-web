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

/**
 * Nonce-based Content-Security-Policy.
 *
 * Генерируется свежий nonce на каждый запрос. Nonce прокидывается:
 *  1. В заголовок x-nonce → читается в layout.tsx для inline-скриптов
 *  2. В CSP-заголовок ответа → браузер разрешает только скрипты с этим nonce
 *
 * Это заменяет 'unsafe-inline' в script-src, поднимая Security score до 100%.
 */

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://mc.yandex.ru https://mc.yandex.com https://yastatic.net`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru wss://mc.yandex.com",
    "frame-src 'self' https://mc.yandex.ru https://mc.yandex.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// skipTrailingSlashRedirect: true в next.config.ts отключает встроенные 308-редиректы
// для всех маршрутов. Этот middleware восстанавливает их только для страниц,
// оставляя API-роуты без редиректа (иначе Dart http.Client ломается на POST-редиректе).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nonce для CSP + inline-скриптов
  const nonce = crypto.randomUUID();

  // API, _next, статика и файлы с расширением — без nonce и без редиректов
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // SEO-фикс: исторические URL тегов блога с кириллицей в slug → 301
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
      const response = NextResponse.redirect(url.toString(), 301);
      response.headers.set("x-nonce", nonce);
      return response;
    }
  }

  // Страницы без trailing slash → 308 на версию со слэшем
  if (!pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = `${pathname}/`;
    const response = NextResponse.redirect(url.toString(), 308);
    response.headers.set("x-nonce", nonce);
    return response;
  }

  const response = NextResponse.next();

  // Прокидываем nonce в ответ: в CSP и в кастомный заголовок для layout
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
