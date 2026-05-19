const https = require('https');

const apiKey = '80e550124ec3f432798361ae30';
const apiUrl = `https://cms.getmasterok.ru/ghost/api/content/posts/?include=tags,authors&formats=html&limit=all&key=${apiKey}`;

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

(async () => {
  const response = await fetchUrl(apiUrl);
  const posts = response.posts;
  
  // Детальный анализ ВСЕХ ссылок в первых 3 статьях
  console.log('=== АНАЛИЗ ССЫЛОК В КОНТЕНТЕ ===\n');
  
  for (let i = 0; i < Math.min(3, posts.length); i++) {
    const post = posts[i];
    console.log(`${i+1}. ${post.slug}\n`);
    
    // All href attributes
    const hrefMatches = post.html.match(/href=["']([^"']+)["']/g) || [];
    if (hrefMatches.length === 0) {
      console.log('  Ссылок не найдено\n');
      continue;
    }
    
    console.log(`  Всего ссылок: ${hrefMatches.length}`);
    hrefMatches.slice(0, 5).forEach(href => {
      const url = href.match(/href=["']([^"']+)["']/)[1];
      console.log(`    - ${url}`);
    });
    if (hrefMatches.length > 5) {
      console.log(`    ... и еще ${hrefMatches.length - 5}`);
    }
    console.log('');
  }
  
  // Глобальный анализ
  console.log('\n=== ГЛОБАЛЬНАЯ СТАТИСТИКА ===\n');
  
  let totalLinks = 0;
  let linksToCalc = 0; // /calc/, /kalkulyator/
  let externalLinks = 0;
  
  posts.forEach(post => {
    const hrefMatches = post.html.match(/href=["']([^"']+)["']/g) || [];
    totalLinks += hrefMatches.length;
    
    hrefMatches.forEach(href => {
      const url = href.match(/href=["']([^"']+)["']/)[1];
      if (url.match(/\/calc/i) || url.match(/\/kalkulyator/i)) {
        linksToCalc++;
      }
      if (url.match(/^http/)) {
        externalLinks++;
      }
    });
  });
  
  console.log(`Всего ссылок в 21 статье: ${totalLinks}`);
  console.log(`Ссылок на калькуляторы (/calc*, /kalkulyator*): ${linksToCalc}`);
  console.log(`Внешних ссылок: ${externalLinks}`);
  
  // Проверка OG/Twitter метаданных
  console.log('\n=== OG / TWITTER МЕТАДАННЫЕ ===\n');
  
  const stats = {
    og_title: 0, og_desc: 0, og_image: 0,
    twitter_title: 0, twitter_desc: 0, twitter_image: 0,
    feat_image: 0, feat_image_alt: 0, meta_title: 0
  };
  
  posts.forEach(post => {
    if (post.og_title) stats.og_title++;
    if (post.og_description) stats.og_desc++;
    if (post.og_image) stats.og_image++;
    if (post.twitter_title) stats.twitter_title++;
    if (post.twitter_description) stats.twitter_desc++;
    if (post.twitter_image) stats.twitter_image++;
    if (post.feature_image) stats.feat_image++;
    if (post.feature_image_alt) stats.feat_image_alt++;
    if (post.meta_title) stats.meta_title++;
  });
  
  Object.entries(stats).forEach(([key, val]) => {
    console.log(`${key}: ${val}/21`);
  });
  
  // Дубликаты description более подробно
  console.log('\n=== ПРОВЕРКА ДУБЛИКАТОВ ===\n');
  
  const descMap = {};
  const dupes = [];
  
  posts.forEach(post => {
    const key = `${post.custom_excerpt || ''}|${post.meta_description || ''}|${post.excerpt || ''}`;
    if (descMap[key]) {
      dupes.push([descMap[key], post.slug]);
    } else {
      descMap[key] = post.slug;
    }
  });
  
  if (dupes.length === 0) {
    console.log('Дубликатов description между статьями не найдено');
  } else {
    dupes.forEach(([a, b]) => console.log(`${a} <-> ${b}`));
  }
  
  // Детальный список всех статей с основными метриками
  console.log('\n=== ПОЛНЫЙ СПИСОК (компактно) ===\n');
  console.log('| Slug | Title L | Meta T | Cust E | Meta D | Excerpt | OG | Twitter | FImg | MetaT |');
  console.log('|' + '-'.repeat(115) + '|');
  
  posts.forEach(post => {
    const row = [
      post.slug.substring(0, 20).padEnd(20),
      String(post.title.length).padEnd(7),
      String(post.meta_title ? post.meta_title.length : 0).padEnd(6),
      String(post.custom_excerpt ? post.custom_excerpt.length : 0).padEnd(6),
      String(post.meta_description ? post.meta_description.length : 0).padEnd(6),
      String(post.excerpt ? post.excerpt.length : 0).padEnd(7),
      (post.og_image ? '1' : '0').padEnd(2),
      (post.twitter_image ? '1' : '0').padEnd(7),
      (post.feature_image ? '1' : '0').padEnd(4),
      post.meta_title ? '1' : '0'
    ];
    console.log('| ' + row.join(' | ') + ' |');
  });
  
})();
