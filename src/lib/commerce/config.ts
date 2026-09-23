import { database, type Sql } from "./db";
import { CommerceError, type CommerceMode, type CommerceSettings, type CommercePublicState, PROCUREMENT_PILOT } from "./types";

export function commerceMode(): CommerceMode {
  const mode = process.env.MONETIZATION_MODE;
  if (mode === "local") {
    const origin = new URL(process.env.COMMERCE_ORIGIN ?? "http://localhost:3460");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("Local simulation must use a localhost origin");
    if (process.env.NODE_ENV === "production" && process.env.COMMERCE_LOCAL_PREVIEW !== "true") throw new Error("Local simulation is disabled in production");
    return "local";
  }
  return mode === "sandbox" || mode === "live" ? mode : "off";
}

export const defaultSettings = (): CommerceSettings => ({
  revision: 1, packPriceKopecks: 24900, proPriceKopecks: 39900,
  checkoutEnabled: commerceMode() === "local", proEnabled: commerceMode() === "local",
  recurringEnabled: false, offersEnabled: false, proAiEnabled: false,
  proAiRequests: 100, freeAiWeeklyRequests: 5, proAiBudgetKopecks: 15000,
  aiInputKopecksPerMillion: 0, aiOutputKopecksPerMillion: 0, aiPriceCheckedAt: "",
  sellerName: "", sellerInn: "", supportEmail: "", offerVersion: "2026-09-22",
  legalApproved: false, offers: [],
});

export async function getSettings(sql?: Sql): Promise<CommerceSettings> {
  if (commerceMode() === "off") return defaultSettings();
  const db = sql ?? await database();
  const result = await db.query<{ value: CommerceSettings }>("SELECT value FROM commerce_settings WHERE id=1");
  // Settings saved before the weekly tariff have no weekly field. Never carry
  // the old daily quota into the new period by accident.
  return { ...defaultSettings(), ...result.rows[0]?.value, freeAiWeeklyRequests: result.rows[0]?.value?.freeAiWeeklyRequests ?? 5 };
}

export function providerConfigured(): boolean {
  return Boolean(process.env.ROBOKASSA_MERCHANT_LOGIN && process.env.ROBOKASSA_PASSWORD1 && process.env.ROBOKASSA_PASSWORD2);
}

export function publicState(settings: CommerceSettings): CommercePublicState {
  const mode = commerceMode();
  const mailReady = Boolean(process.env.COMMERCE_MAIL_FROM && (process.env.RESEND_API_KEY || process.env.COMMERCE_SMTP_URL));
  const liveReady = mode !== "live" || Boolean(process.env.COMMERCE_ALLOW_LIVE_PAYMENTS === "true" && settings.legalApproved && settings.sellerName && /^\d{12}$/.test(settings.sellerInn) && settings.supportEmail && process.env.COMMERCE_AUTH_SECRET && process.env.COMMERCE_DATABASE_URL && mailReady && process.env.COMMERCE_CHECKS_NPD_CONFIRMED === "true");
  const checkoutAvailable = mode !== "off" && settings.checkoutEnabled && liveReady && (mode === "local" || providerConfigured());
  const aiAvailable = mode !== "off" && settings.proAiEnabled && Boolean(process.env.DEEPSEEK_API_KEY) && settings.aiInputKopecksPerMillion > 0 && settings.aiOutputKopecksPerMillion > 0 && Date.parse(settings.aiPriceCheckedAt) <= Date.now() && Date.parse(settings.aiPriceCheckedAt) > Date.now() - 31 * 86400000;
  return {
    mode, enabled: mode !== "off", checkoutAvailable,
    proAvailable: checkoutAvailable && settings.proEnabled && (mode === "local" || aiAvailable),
    recurringAvailable: checkoutAvailable && settings.recurringEnabled && (mode === "local" || process.env.ROBOKASSA_RECURRING_APPROVED === "true"),
    aiAvailable,
    packPriceKopecks: settings.packPriceKopecks, proPriceKopecks: settings.proPriceKopecks,
    proAiRequests: settings.proAiRequests, freeAiWeeklyRequests: settings.freeAiWeeklyRequests, offerVersion: settings.offerVersion,
    sellerName: settings.sellerName, sellerInn: settings.sellerInn, supportEmail: settings.supportEmail,
  };
}

export function validateSettings(raw: unknown): CommerceSettings {
  if (!raw || typeof raw !== "object") throw new CommerceError(400, "Некорректные настройки");
  const s = raw as CommerceSettings;
  if (!Number.isInteger(s.revision) || s.revision < 1) throw new CommerceError(400, "Некорректная версия настроек");
  for (const key of ["packPriceKopecks", "proPriceKopecks"] as const) if (!Number.isInteger(s[key]) || s[key] < 100 || s[key] > 1000000) throw new CommerceError(400, "Цена должна быть от 1 до 10 000 ₽");
  for (const key of ["checkoutEnabled", "proEnabled", "recurringEnabled", "offersEnabled", "proAiEnabled", "legalApproved"] as const) if (typeof s[key] !== "boolean") throw new CommerceError(400, "Некорректный переключатель");
  for (const key of ["proAiRequests", "proAiBudgetKopecks", "aiInputKopecksPerMillion", "aiOutputKopecksPerMillion"] as const) if (!Number.isInteger(s[key]) || s[key] < 0 || s[key] > 1000000) throw new CommerceError(400, "Некорректный лимит ИИ");
  if (!Number.isInteger(s.freeAiWeeklyRequests) || s.freeAiWeeklyRequests < 0 || s.freeAiWeeklyRequests > 100) throw new CommerceError(400, "Бесплатный недельный лимит должен быть от 0 до 100");
  if (s.proAiRequests <= s.freeAiWeeklyRequests * 5) throw new CommerceError(400, "Лимит PRO за месяц должен быть больше пяти недель бесплатного доступа");
  for (const key of ["sellerName", "sellerInn", "supportEmail", "offerVersion", "aiPriceCheckedAt"] as const) if (typeof s[key] !== "string" || s[key].length > 250) throw new CommerceError(400, "Слишком длинные реквизиты");
  if (!Array.isArray(s.offers) || s.offers.length > 100) throw new CommerceError(400, "Не более 100 предложений");
  const ids = new Set<string>();
  for (const offer of s.offers) {
    if (!offer || typeof offer.enabled !== "boolean") throw new CommerceError(400, "Некорректный переключатель предложения");
    if (!offer || !/^[a-z0-9-]{1,80}$/.test(offer.id) || ids.has(offer.id)) throw new CommerceError(400, "У предложения должен быть уникальный идентификатор");
    ids.add(offer.id);
    if (!["lemanapro", "yandex_market", "sponsor"].includes(offer.provider)) throw new CommerceError(400, "Неизвестный тип предложения");
    let url: URL;
    try { url = new URL(offer.url); } catch { throw new CommerceError(400, "Укажите HTTPS-ссылку"); }
    if (url.protocol !== "https:" || url.username || url.password || /^(localhost|127\.|10\.|192\.168\.|\[)/.test(url.hostname)) throw new CommerceError(400, "Недопустимая ссылка магазина");
    if (offer.provider === "lemanapro" && !/(^|\.)lemanapro\.ru$/.test(url.hostname)) throw new CommerceError(400, "Для Лемана ПРО нужна официальная ссылка");
    if (offer.provider === "yandex_market" && !/(^|\.)(market\.yandex\.ru|ya\.cc)$/.test(url.hostname)) throw new CommerceError(400, "Для Маркета нужна официальная партнёрская ссылка");
    if (!Array.isArray(offer.calculatorSlugs) || offer.calculatorSlugs.length === 0 || offer.calculatorSlugs.some((slug) => !(PROCUREMENT_PILOT as readonly string[]).includes(slug))) throw new CommerceError(400, "Укажите калькуляторы пилота");
    for (const key of ["title", "suitability", "limitations", "advertiser", "advertiserInn", "erid", "contractReference", "reviewedAt", "expiresAt"] as const) if (typeof offer[key] !== "string" || offer[key].length > 1000) throw new CommerceError(400, "Некорректное описание предложения");
    if (offer.enabled && (!offer.title || !offer.suitability || !offer.advertiser || !/^\d{10}(\d{2})?$/.test(offer.advertiserInn) || !offer.erid || !offer.contractReference || !Number.isFinite(Date.parse(offer.reviewedAt)) || Date.parse(offer.reviewedAt) > Date.now() || Date.parse(offer.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(offer.expiresAt)))) throw new CommerceError(400, "До включения нужны договор, проверка пригодности, рекламодатель, ERID и срок действия");
  }
  return s;
}
