import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// skipTrailingSlashRedirect: true в next.config.ts отключает встроенные 308-редиректы
// для всех маршрутов. Этот middleware восстанавливает их только для страниц,
// оставляя API-роуты без редиректа (иначе Dart http.Client ломается на POST-редиректе).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API, _next, статика и файлы с расширением — без изменений
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Страницы без trailing slash → 308 на версию со слэшем
  if (!pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname + "/";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
