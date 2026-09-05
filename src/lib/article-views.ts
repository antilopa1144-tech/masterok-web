export const ARTICLE_VIEWS_URL = "https://cms.getmasterok.ru/article-views/";
export const VIEW_WINDOW_MS = 30 * 60 * 1000;
const VISITOR_TTL_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Per-article ID: not a cross-site/cross-article visitor profile. Storage denial skips counting. */
export function articleVisitor(storage: Pick<Storage, "getItem" | "setItem">, slug: string, now = Date.now()): string | null {
  try {
    const key = `masterok:article-view:${slug}`;
    const raw = storage.getItem(key);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (UUID.test(saved.id) && Number.isFinite(saved.expires) && saved.expires > now && saved.expires <= now + VISITOR_TTL_MS) {
          storage.setItem(key, JSON.stringify({ id: saved.id, expires: now + VISITOR_TTL_MS }));
          return saved.id;
        }
      } catch { /* Replace malformed/old state, never fail the article. */ }
    }
    const id = crypto.randomUUID();
    storage.setItem(key, JSON.stringify({ id, expires: now + VISITOR_TTL_MS }));
    return id;
  } catch {
    return null;
  }
}

export function validViewCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
