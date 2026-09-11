import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ROUTE_CALCULATOR_CATEGORY,
  ROUTE_CALCULATOR_SLUGS,
  ROUTE_CATEGORY_SLUGS,
  ROUTE_CHECKLIST_SLUGS,
  ROUTE_TOOL_SLUGS,
} from "./lib/seo/route-manifest.generated";

// =============================================================================
// Валидация динамических маршрутов ДО рендера.
//
// Зачем: notFound() внутри страницы вызывается уже после начала стриминга,
// когда заголовки и код ответа отправлены, поэтому несуществующие адреса
// отдавали 200 с пустым телом (мягкий 404) и с конфликтующими тегами robots.
// Middleware исполняется раньше рендера — здесь статус гарантирован.
//
// Списки маршрутов лежат в route-manifest.generated.ts строками: middleware
// работает на Edge и не может импортировать модули с Node-зависимостями.
// =============================================================================

const CATEGORY_SLUGS = new Set<string>(ROUTE_CATEGORY_SLUGS);
const CALCULATOR_SLUGS = new Set<string>(ROUTE_CALCULATOR_SLUGS);
const TOOL_SLUGS = new Set<string>(ROUTE_TOOL_SLUGS);
const CHECKLIST_SLUGS = new Set<string>(ROUTE_CHECKLIST_SLUGS);

/** Сегменты пути без ведущего и замыкающего слэша. */
function segmentsOf(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function notFoundResponse(nonce: string): NextResponse {
  // Отдаём 404 прямо из middleware: rewrite на внутренний /not-found приводит
  // к 500, а notFound() внутри страницы не успевает повлиять на статус,
  // потому что заголовки уже отправлены стримингом. Тело — минимальная
  // страница со ссылкой на каталог; роботам важен код ответа, не разметка.
  const response = new NextResponse(
    `<!doctype html><html lang="ru"><head><meta charset="utf-8">` +
      `<meta name="robots" content="noindex, follow">` +
      `<title>Страница не найдена — Мастерок</title></head>` +
      `<body><h1>Страница не найдена</h1>` +
      `<p>Возможно, адрес изменился. Откройте <a href="/kalkulyatory/">каталог калькуляторов</a> или <a href="/">главную</a>.</p>` +
      `</body></html>`,
    {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Ответ на несуществующий адрес не должен осесть в кэше CDN.
        "cache-control": "no-store",
      },
    },
  );
  response.headers.set("x-nonce", nonce);
  return response;
}

/**
 * Проверяет динамические маршруты. Возвращает 404/301 либо null, если адрес
 * валиден и его должен обработать рендер.
 */
function validateDynamicRoute(request: NextRequest, nonce: string): NextResponse | null {
  const { pathname } = request.nextUrl;
  const seg = segmentsOf(pathname);

  if (seg[0] === "kalkulyatory") {
    // /kalkulyatory/<category>/<slug>/
    if (seg.length >= 3) {
      const category = seg[1];
      const slug = seg[2];
      const canonicalCategory = ROUTE_CALCULATOR_CATEGORY[slug];
      if (!canonicalCategory || !CALCULATOR_SLUGS.has(slug)) return notFoundResponse(nonce);
      // Известный калькулятор по чужой категории — постоянный редирект на канонический адрес.
      if (category !== canonicalCategory) {
        const url = new URL(request.url);
        url.pathname = `/kalkulyatory/${canonicalCategory}/${slug}/`;
        const response = NextResponse.redirect(url.toString(), 301);
        response.headers.set("x-nonce", nonce);
        return response;
      }
      return null;
    }
    // /kalkulyatory/<category>/
    if (seg.length === 2) {
      return CATEGORY_SLUGS.has(seg[1]) ? null : notFoundResponse(nonce);
    }
    return null;
  }

  if (seg[0] === "instrumenty") {
    // /instrumenty/chek-listy/<slug>/
    if (seg[1] === "chek-listy" && seg.length >= 3) {
      return CHECKLIST_SLUGS.has(seg[2]) ? null : notFoundResponse(nonce);
    }
    // /instrumenty/<slug>/
    if (seg.length === 2) {
      // Каталог чек-листов — статический маршрут, не инструмент из реестра.
      if (seg[1] === "chek-listy") return null;
      return TOOL_SLUGS.has(seg[1]) ? null : notFoundResponse(nonce);
    }
    return null;
  }

  return null;
}

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
    `script-src 'self' 'unsafe-eval' 'nonce-${nonce}' https://mc.yandex.ru https://mc.yandex.com https://yastatic.net https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://cms.getmasterok.ru/article-views/ https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru wss://mc.yandex.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
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

  // Валидация динамических маршрутов: несуществующие slug и категории должны
  // получить 404 здесь, а не после старта стриминга (иначе мягкий 404 с кодом 200).
  const routeVerdict = validateDynamicRoute(request, nonce);
  if (routeVerdict) return routeVerdict;

  const response = NextResponse.next();

  // Прокидываем nonce в ответ: в CSP и в кастомный заголовок для layout
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("x-nonce", nonce);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
