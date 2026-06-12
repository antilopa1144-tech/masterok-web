/**
 * Аудит SEO-метрик статей Ghost CMS.
 * Запуск: GHOST_CONTENT_API_KEY=... node scripts/audit-ghost.js
 * Опционально: GHOST_API_URL=https://cms.getmasterok.ru
 */
const https = require("https");

const apiKey = process.env.GHOST_CONTENT_API_KEY;
const ghostBase = (process.env.GHOST_API_URL ?? "https://cms.getmasterok.ru").replace(/\/$/, "");

if (!apiKey) {
  console.error("Укажите GHOST_CONTENT_API_KEY в окружении.");
  process.exit(1);
}

const apiUrl = `${ghostBase}/ghost/api/content/posts/?include=tags,authors&formats=html&limit=all&key=${apiKey}`;

function getHtmlMetrics(html) {
  const h1Matches = html.match(/<h1[^>]*>([^<]*)<\/h1>/g) || [];
  const h1Count = h1Matches.length;
  const h1Text = h1Matches[0]?.replace(/<[^>]*>/g, "") || "";

  const h2Matches = html.match(/<h2[^>]*>([^<]*)<\/h2>/g) || [];
  const h2Count = h2Matches.length;
  const h2List = h2Matches.map((m) => m.replace(/<[^>]*>/g, "")).join(" | ");

  const h3Count = (html.match(/<h3[^>]*>/g) || []).length;
  const tableCount = (html.match(/<table[^>]*>/g) || []).length;

  const imgMatches = html.match(/<img[^>]*>/g) || [];
  const imgNoAlt = imgMatches.filter((img) => !img.match(/\salt\s*=/i)).length;

  const internalCalcs = (html.match(/getmasterok\.ru\/kalkulyatory\//g) || []).length;
  const relativeCalcs = (html.match(/\/kalkulyatory\//g) || []).length;
  const externalLinks = (html.match(/href\s*=\s*"https?:\/\/(?!getmasterok\.ru)/g) || []).length;

  const hasStyle = /<style|style\s*=/.test(html);

  return {
    h1Count,
    h1Text,
    h2Count,
    h2List,
    h3Count,
    tableCount,
    imgNoAlt,
    internalCalcs,
    relativeCalcs,
    externalLinks,
    hasStyle,
    htmlLen: html.length,
  };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

(async () => {
  try {
    const response = await fetchUrl(apiUrl);
    const posts = response.posts;

    console.log(`Аудит Ghost CMS: ${posts.length} статей\n`);

    const audit = [];
    const descMap = {};
    const dupes = [];
    const isolated = [];

    for (const post of posts) {
      const metrics = getHtmlMetrics(post.html);

      const slug = post.slug;
      const title = post.title;
      const titleLen = title.length;
      const customExcerpt = post.custom_excerpt || "";
      const metaDesc = post.meta_description || "";
      const excerpt = post.excerpt || "";

      const item = {
        slug,
        title_len: titleLen,
        custom_excerpt_len: customExcerpt.length,
        meta_desc_len: metaDesc.length,
        h1_count: metrics.h1Count,
        h2_count: metrics.h2Count,
        h3_count: metrics.h3Count,
        tables: metrics.tableCount,
        img_no_alt: metrics.imgNoAlt,
        calc_links: metrics.relativeCalcs,
        ext_links: metrics.externalLinks,
        has_style: metrics.hasStyle ? 1 : 0,
        og_image: post.og_image ? 1 : 0,
        twitter_image: post.twitter_image ? 1 : 0,
        feat_img: post.feature_image ? 1 : 0,
        h2_sample: metrics.h2List.substring(0, 100),
      };

      audit.push(item);

      const descKey = `${metaDesc}|${customExcerpt}|${excerpt}`;
      if (descMap[descKey]) {
        dupes.push({ posts: [descMap[descKey], slug], desc: metaDesc.substring(0, 50) });
      } else {
        descMap[descKey] = slug;
      }

      if (metrics.relativeCalcs === 0 && metrics.internalCalcs === 0) {
        isolated.push(slug);
      }
    }

    console.log("ТАБЛИЦА МЕТРИК:");
    console.log("Slug | TLen | ExcLen | H1 | H2 | Tables | ImgNoAlt | CalcLinks | HasStyle");
    console.log("-".repeat(85));
    for (const item of audit) {
      const row = `${item.slug.padEnd(20)} | ${item.title_len} | ${item.custom_excerpt_len} | ${item.h1_count} | ${item.h2_count} | ${item.tables} | ${item.img_no_alt} | ${item.calc_links} | ${item.has_style}`;
      console.log(row);
    }

    console.log("\nСТАТИСТИКА:");
    console.log(`- H1 в body > 0: ${audit.filter((a) => a.h1_count > 0).length}`);
    console.log(`- Таблицы: ${audit.filter((a) => a.tables > 0).length}`);
    console.log(`- Img без alt: ${audit.filter((a) => a.img_no_alt > 0).length}`);
    console.log(`- Inline styles: ${audit.filter((a) => a.has_style).length}`);
    console.log(`- БЕЗ ссылок на калькуляторы: ${isolated.length}`);

    if (isolated.length > 0) {
      console.log("\nИЗОЛИРОВАННЫЕ СТАТЬИ:");
      isolated.forEach((s) => console.log(`  - ${s}`));
    }

    console.log("\nПРОБЛЕМЫ С TITLE (< 25 или > 70 символов):");
    audit
      .filter((a) => a.title_len < 25 || a.title_len > 70)
      .forEach((a) => {
        console.log(`  ${a.slug}: ${a.title_len} сим`);
      });

    if (dupes.length > 0) {
      console.log("\nДУБЛИКАТЫ DESCRIPTION:");
      dupes.forEach((d) => console.log(`  ${d.posts.join(" <-> ")}: "${d.desc}..."`));
    } else {
      console.log("\nДубликатов description не найдено");
    }
  } catch (e) {
    console.error("Ошибка:", e.message);
    process.exit(1);
  }
})();
