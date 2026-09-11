#!/usr/bin/env node
/**
 * Проверка SEO-правок на живых URL.
 *
 * Зачем скрипт: проверка после деплоя делалась разовыми командами, и один раз
 * я уже ошибся, приняв строку из JSON-LD за ответ в видимом DOM. Здесь правила
 * зафиксированы: перед поиском маркера из HTML вырезаются <script>, иначе
 * разметка выдаёт себя за контент.
 *
 * Запуск:
 *   node scripts/verify-live-seo.mjs
 *   node scripts/verify-live-seo.mjs --site http://127.0.0.1:3000
 *   node scripts/verify-live-seo.mjs --site http://127.0.0.1:3000 --skip-blog
 *
 * `--skip-blog` нужен только для локального прогона: страницы блога и тегов
 * тянут контент из Ghost Content API, которого в локальном окружении нет.
 * `--skip-ghost` дополнительно снимает проверки, которым нужны sitemap и
 * страницы категорий: они тоже зависят от Ghost.
 *
 * Код возврата 1, если хотя бы одна проверка не прошла.
 */

const DEFAULT_SITE = "https://getmasterok.ru";
const TITLE_MAX = 60;
const DESCRIPTION_MIN = 120;
const DESCRIPTION_MAX = 165;

const args = process.argv.slice(2);
const siteArgIndex = args.indexOf("--site");
const SITE = (siteArgIndex >= 0 ? args[siteArgIndex + 1] : process.env.SITE_URL) ?? DEFAULT_SITE;
const SKIP_BLOG = args.includes("--skip-blog");
const SKIP_GHOST = args.includes("--skip-ghost");

/** Убирает script/style: в них лежит JSON-LD, который повторяет видимый текст. */
function visibleHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

function title(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1] : "";
}

function description(html) {
  const match = html.match(/<meta name="description" content="([^"]*)"/i);
  return match ? match[1] : "";
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  return { status: response.status, body: await response.text() };
}

/**
 * @param {string} name
 * @param {() => Promise<string | null>} run — null значит «проверка пройдена»,
 *   строка — описание расхождения.
 */
const checks = [
  {
    name: "robots.txt разрешает AI-краулеров",
    async run() {
      const { body } = await fetchText(`${SITE}/robots.txt`);
      const missing = ["Applebot-Extended", "YandexAdditional", "CCBot", "meta-externalagent"].filter(
        (agent) => !body.includes(agent),
      );
      return missing.length ? `нет правил: ${missing.join(", ")}` : null;
    },
  },
  {
    name: "llms.txt покрывает каталог и не завышает число",
    needsGhost: true,
    async run() {
      const { body } = await fetchText(`${SITE}/llms.txt`);
      if (!body.includes("## Частые вопросы")) return "нет блока «Частые вопросы»";
      if (!body.includes("/ai/")) return "нет ссылки на /ai/";
      const inflated = body.match(/\d+\+/);
      if (inflated) return `завышенное число: ${inflated[0]}`;
      const calculators = (body.match(/\/kalkulyatory\/[a-z0-9-]+\/[a-z0-9-]+\//g) ?? []).length;
      if (calculators < 65) return `калькуляторов в списке: ${calculators}, ожидалось не меньше 65`;
      return null;
    },
  },
  {
    name: "/proekty/ без дубля бренда в title",
    async run() {
      const { body } = await fetchText(`${SITE}/proekty/`);
      const value = title(body);
      if (!value) return "нет title";
      const brands = (value.match(/Мастерок/g) ?? []).length;
      return brands > 1 ? `бренд повторяется ${brands} раза: ${value}` : null;
    },
  },
  {
    name: "ответы FAQ страниц категорий есть в HTML",
    needsGhost: true,
    async run() {
      const { body } = await fetchText(`${SITE}/kalkulyatory/krovlya/`);
      return visibleHtml(body).includes("Керамическая черепица служит")
        ? null
        : "ответ FAQ отсутствует в DOM (остался только в JSON-LD)";
    },
  },
  {
    name: "вопросные h2 на страницах калькуляторов",
    async run() {
      const { body } = await fetchText(`${SITE}/kalkulyatory/fundament/beton/`);
      return /<h2[^>]*>[^<]*\?<\/h2>/.test(visibleHtml(body))
        ? null
        : "ни одного вопроса, размеченного как h2";
    },
  },
  {
    name: "усиленные страницы содержат новые блоки",
    async run() {
      const expectations = [
        ["/instrumenty/tajmer-skhvatyvaniya/", "Сроки схватывания и высыхания"],
        ["/instrumenty/kalendar-remonta/", "Этапы ремонта по сценариям"],
        ["/prilozhenie/", "Приложение или веб-версия"],
        ["/instrumenty/konverter/", "насыпной плотности"],
      ];
      const missing = [];
      for (const [path, marker] of expectations) {
        const { body } = await fetchText(`${SITE}${path}`);
        if (!visibleHtml(body).includes(marker)) missing.push(`${path} → «${marker}»`);
      }
      return missing.length ? `нет блоков: ${missing.join("; ")}` : null;
    },
  },
  {
    name: "title ≤ 60 и description 120–165 по всем URL sitemap",
    needsGhost: true,
    async run() {
      const index = await fetchText(`${SITE}/sitemap.xml`);
      const maps = [...index.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const collected = [];
      for (const map of maps) {
        const { body } = await fetchText(map);
        collected.push(...[...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
      }
      // Sitemap всегда содержит абсолютные URL продакшен-домена. При прогоне
      // против локального сервера их нужно переписать на проверяемый хост,
      // иначе проверка незаметно уйдёт на прод.
      const target = new URL(SITE);
      const urls = collected
        .map((url) => {
          const parsed = new URL(url);
          return `${target.origin}${parsed.pathname}${parsed.search}`;
        })
        .filter((url) => (SKIP_BLOG ? !url.includes("/blog/") : true));

      const problems = [];
      const chunk = 8;
      for (let i = 0; i < urls.length; i += chunk) {
        const slice = urls.slice(i, i + chunk);
        const results = await Promise.all(
          slice.map(async (url) => {
            try {
              const { body } = await fetchText(url);
              return { url, title: title(body), description: description(body) };
            } catch (error) {
              return { url, error: String(error) };
            }
          }),
        );
        for (const item of results) {
          if (item.error) {
            problems.push(`${item.url}: ${item.error}`);
            continue;
          }
          if (!item.title) problems.push(`${item.url}: нет title`);
          else if (item.title.length > TITLE_MAX) problems.push(`${item.url}: title ${item.title.length}`);
          if (item.description && (item.description.length < DESCRIPTION_MIN || item.description.length > DESCRIPTION_MAX)) {
            problems.push(`${item.url}: description ${item.description.length}`);
          }
          if ((item.title.match(/Мастерок/g) ?? []).length > 1) {
            problems.push(`${item.url}: дубль бренда в title`);
          }
        }
      }

      if (problems.length) {
        return `проверено ${urls.length} URL, проблем ${problems.length}:\n      ${problems.slice(0, 12).join("\n      ")}`;
      }
      return null;
    },
  },
];

let failed = 0;
let skipped = 0;
console.log(`Проверка живых URL: ${SITE}\n`);

for (const check of checks) {
  if (check.needsGhost && SKIP_GHOST) {
    skipped += 1;
    console.log(`  skip  ${check.name} (нужен Ghost)`);
    continue;
  }
  let result;
  try {
    result = await check.run();
  } catch (error) {
    result = `ошибка запроса: ${String(error)}`;
  }
  if (result === null) {
    console.log(`  ok    ${check.name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${check.name}\n        ${result}`);
  }
}

if (failed > 0) {
  console.log(
    `\nНе пройдено проверок: ${failed}${skipped ? `, пропущено: ${skipped}` : ""}.` +
      "\nЕсли расходится всё сразу — прод отдаёт старую сборку.",
  );
} else if (skipped > 0) {
  console.log(`\nПройдено проверок: ${checks.length - skipped}, пропущено по окружению: ${skipped}.`);
} else {
  console.log("\nВсе проверки пройдены: свежая сборка на проде.");
}

process.exit(failed === 0 ? 0 : 1);

