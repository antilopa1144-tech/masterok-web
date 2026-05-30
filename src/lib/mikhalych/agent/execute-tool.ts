import { getCalculateFn } from "@/lib/calculators/registry";
import { getCalculatorBySlug } from "@/lib/calculators";
import {
  calculatorPageUrl,
  getCalculatorSchemaPayload,
  mergeCalculatorValues,
  searchCalculators,
} from "./catalog";
import { compactCalculatorResult } from "./compact-result";
import { calculatorResultToProjectEntry } from "./project-entry";
import { searchKnowledgeBase } from "./knowledge";
import type { AgentProjectEntryPayload, CalculatorLink } from "./types";

export interface ToolExecutionContext {
  siteOrigin: string;
  calculatorLinks: CalculatorLink[];
  toolsUsed: string[];
  projectEntries: AgentProjectEntryPayload[];
}

function parseJsonArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fallthrough */
  }
  return {};
}

export async function executeAgentTool(
  name: string,
  argsJson: string,
  ctx: ToolExecutionContext,
): Promise<string> {
  ctx.toolsUsed.push(name);
  const args = parseJsonArgs(argsJson);

  switch (name) {
    case "list_calculators": {
      const query = String(args.query ?? "");
      const limit = clampInt(args.limit, 8, 1, 12);
      const items = searchCalculators(query, limit);
      return JSON.stringify({ calculators: items });
    }

    case "get_calculator_schema": {
      const slug = String(args.slug ?? "").trim();
      return JSON.stringify(getCalculatorSchemaPayload(slug));
    }

    case "run_calculator": {
      const slug = String(args.slug ?? "").trim();
      const def = getCalculatorBySlug(slug);
      if (!def) {
        return JSON.stringify({ error: `Калькулятор не найден: ${slug}` });
      }

      const partial =
        args.values && typeof args.values === "object" && !Array.isArray(args.values)
          ? (args.values as Record<string, number>)
          : {};

      const values = mergeCalculatorValues(def.fields, partial);
      const calculate = await getCalculateFn(slug);
      if (!calculate) {
        return JSON.stringify({ error: `Формула не загружена для slug: ${slug}` });
      }

      const result = calculate(values);
      const url = calculatorPageUrl(ctx.siteOrigin, def.categorySlug, slug);
      ctx.calculatorLinks.push({ slug, title: def.title, url });
      ctx.projectEntries.push(calculatorResultToProjectEntry(def, result));

      const compact = compactCalculatorResult(slug, def.title, url, result);
      return JSON.stringify({
        ...compact,
        projectEntryReady: true,
        hint: "Клиент может сохранить в проект; предложи пользователю кнопку «В смету».",
      });
    }

    case "search_knowledge_base": {
      const query = String(args.query ?? "");
      const limit = clampInt(args.limit, 4, 1, 8);
      const hits = searchKnowledgeBase(query, limit);
      return JSON.stringify({
        query,
        snippets: hits.map((s) => ({
          id: s.id,
          title: s.title,
          text: s.text,
          source: "masterok-knowledge-v1",
        })),
        note: "Справочные выдержки Мастерок; для актуальных СП/ГОСТ сверяйте с официальными текстами и web_search.",
      });
    }

    case "web_search": {
      return JSON.stringify(await webSearch(String(args.query ?? "")));
    }

    case "fetch_url": {
      return JSON.stringify(await fetchUrlMarkdown(String(args.url ?? "")));
    }

    case "get_weather": {
      return JSON.stringify(await getWeather(String(args.city ?? "")));
    }

    case "get_material_price": {
      return JSON.stringify(await getMaterialPrice(String(args.material ?? ""), ctx));
    }

    default:
      return JSON.stringify({ error: `Неизвестный tool: ${name}` });
  }
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

async function webSearch(query: string): Promise<Record<string, unknown>> {
  const q = query.trim();
  if (!q) return { error: "Пустой запрос" };

  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) {
    return {
      error: "web_search не настроен на сервере (нет SERPER_API_KEY)",
      hint: "Попроси ссылку у пользователя и используй fetch_url, или ответь без актуальных цен из сети.",
    };
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q, gl: "ru", hl: "ru", num: 6 }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    return { error: `Поиск недоступен: HTTP ${res.status}` };
  }

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };

  return {
    query: q,
    results: (data.organic ?? []).slice(0, 6).map((r) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })),
  };
}

async function fetchUrlMarkdown(url: string): Promise<Record<string, unknown>> {
  const normalized = url.trim();
  if (!normalized) return { error: "Пустой URL" };

  const target = normalized.startsWith("http") ? normalized : `https://${normalized}`;
  const readerUrl = `https://r.jina.ai/${target}`;

  const headers: Record<string, string> = { Accept: "text/markdown" };
  const jinaKey = process.env.JINA_API_KEY?.trim();
  if (jinaKey) headers.Authorization = `Bearer ${jinaKey}`;

  const res = await fetch(readerUrl, {
    headers,
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) {
    return { error: `Не удалось загрузить страницу: HTTP ${res.status}`, url: target };
  }

  const markdown = await res.text();
  const maxChars = 14_000;
  const excerpt =
    markdown.length > maxChars
      ? `${markdown.slice(0, maxChars)}\n\n…[обрезано]`
      : markdown;

  return {
    url: target,
    fetchedAt: new Date().toISOString(),
    provider: "jina-reader",
    markdown: excerpt,
  };
}

// ── get_weather: прогноз для уличных работ (Open-Meteo, без ключа) ──────────
// Важно для стройки: бетон не льют в мороз без присадок, фасад/кровлю/штукатурку
// не делают в дождь и около 0°C. Возвращаем 3-дневный прогноз с акцентом на
// температуру и осадки + готовую пометку о пригодности к работам.
async function getWeather(city: string): Promise<Record<string, unknown>> {
  const q = city.trim();
  if (!q) return { error: "Не указан город" };

  // 1. Геокодинг города → координаты (Open-Meteo geocoding, бесплатно, без ключа).
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=ru&format=json`,
    { signal: AbortSignal.timeout(15_000) },
  ).catch(() => null);

  if (!geoRes?.ok) return { error: "Сервис погоды недоступен" };
  const geo = (await geoRes.json()) as {
    results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string }>;
  };
  const place = geo.results?.[0];
  if (!place) return { error: `Город не найден: ${q}`, hint: "Уточни название города." };

  // 2. Прогноз: дневная мин/макс температура и сумма осадков на 3 дня.
  const fRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=3`,
    { signal: AbortSignal.timeout(15_000) },
  ).catch(() => null);

  if (!fRes?.ok) return { error: "Прогноз недоступен" };
  const f = (await fRes.json()) as {
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_sum?: number[];
    };
  };
  const d = f.daily;
  if (!d?.time?.length) return { error: "Нет данных прогноза" };

  const days = d.time.map((date, i) => {
    const tMin = d.temperature_2m_min?.[i] ?? null;
    const tMax = d.temperature_2m_max?.[i] ?? null;
    const rain = d.precipitation_sum?.[i] ?? 0;
    // Пригодность к уличным «мокрым» работам (бетон, штукатурка, фасад, кровля).
    const tooCold = tMin !== null && tMin < 5;
    const wet = rain >= 1;
    const ok = !tooCold && !wet;
    return {
      date,
      tempMin: tMin,
      tempMax: tMax,
      precipitationMm: rain,
      outdoorWorkOk: ok,
      note: tooCold
        ? "Холодно (<5°C) — бетон/штукатурка/клей требуют противоморозных присадок или переноса."
        : wet
          ? "Осадки — фасад, кровлю, штукатурку и заливку лучше перенести."
          : "Условия подходят для уличных работ.",
    };
  });

  return {
    city: place.admin1 ? `${place.name}, ${place.admin1}` : place.name,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
    forecast: days,
  };
}

// ── get_material_price: ориентир цены через web_search + fetch_url ──────────
// Не отдельный платный API: оркеструет уже рабочие Serper (поиск) и Jina (чтение).
// Возвращает не «точную цену», а ориентир из выдачи + ссылки — модель проговорит
// диапазон. Цены в РФ-ритейле волатильны, поэтому честно помечаем как ориентир.
async function getMaterialPrice(
  material: string,
  _ctx: ToolExecutionContext,
): Promise<Record<string, unknown>> {
  const q = material.trim();
  if (!q) return { error: "Не указан материал" };

  const search = await webSearch(`${q} цена купить`);
  if (search.error) {
    return {
      error: "Не удалось получить цены из сети",
      reason: search.error,
      hint: "Сообщи пользователю, что актуальную цену нужно проверить в магазине; дай расчёт количества.",
    };
  }

  const results = (search.results as Array<{ title?: string; url?: string; snippet?: string }>) ?? [];
  // Вытаскиваем числа, похожие на рубли, из заголовков/сниппетов выдачи.
  const priceHints: number[] = [];
  for (const r of results) {
    const text = `${r.title ?? ""} ${r.snippet ?? ""}`;
    for (const m of text.matchAll(/(\d[\d\s]{1,7})\s*(?:₽|руб|р\.)/gi)) {
      const n = Number(m[1].replace(/\s/g, ""));
      if (Number.isFinite(n) && n > 0 && n < 10_000_000) priceHints.push(n);
    }
  }
  priceHints.sort((a, b) => a - b);

  return {
    material: q,
    provider: "serper-web-search",
    fetchedAt: new Date().toISOString(),
    priceHintsRub: priceHints.slice(0, 8),
    priceRange:
      priceHints.length > 0
        ? { min: priceHints[0], max: priceHints[priceHints.length - 1] }
        : null,
    sources: results.slice(0, 5).map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
    note:
      "Это ориентир из поисковой выдачи, НЕ точная цена. Назови диапазон, посоветуй проверить в магазине. При необходимости открой ссылку через fetch_url для уточнения.",
  };
}
