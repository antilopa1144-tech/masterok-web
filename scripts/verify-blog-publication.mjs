/** Isolated production-mode lifecycle test. Never publishes to real Ghost. */
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';

const project = path.resolve(process.argv[2] ?? '');
if (!process.argv[2] || !project.includes('publication-a-smoke')) {
  throw new Error('Pass an isolated publication-a-smoke project directory, never the working checkout.');
}
const appPort = Number(process.env.BLOG_SMOKE_PORT ?? 3126);
const appUrl = `http://127.0.0.1:${appPort}`;
const seed = {
  id: 'seed', slug: 'publication-seed', title: 'Исходная тестовая статья',
  html: '<h2 id="seed">Исходный текст</h2><p>Тестовая статья для проверки публикационного контура.</p>',
  published_at: '2026-09-05T00:00:00.000Z', updated_at: '2026-09-05T00:00:00.000Z',
  tags: [{ id: 'tag-base', name: 'Ремонт', slug: 'remont' }],
  primary_tag: { id: 'tag-base', name: 'Ремонт', slug: 'remont' },
  feature_image: `${appUrl}/og-image.png`, reading_time: 1, custom_excerpt: 'Проверка публикации.',
};
let posts = [seed];
let cmsReads = 0;
let cmsUnavailable = false;
const cms = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/ghost/api/content/')) { res.writeHead(404).end(); return; }
  cmsReads += 1;
  if (cmsUnavailable) { res.writeHead(503).end(); return; }
  const slug = url.pathname.match(/\/posts\/slug\/([^/]+)\//)?.[1];
  const selected = slug ? posts.filter(p => p.slug === slug) : posts;
  res.writeHead(slug && !selected.length ? 404 : 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ posts: selected, meta: { pagination: { page: 1, pages: 1, total: selected.length, limit: 'all' } } }));
});
await new Promise(resolve => cms.listen(0, '127.0.0.1', resolve));
const testSecret = randomBytes(32).toString('hex');
const env = { ...process.env, GHOST_API_URL: `http://127.0.0.1:${cms.address().port}`, GHOST_CONTENT_API_KEY: 'local-smoke-only', BLOG_REVALIDATE_SECRET: testSecret, NEXT_PUBLIC_SITE_URL: appUrl, NEXT_TELEMETRY_DISABLED: '1' };
const cli = path.join(project, 'node_modules', 'next', 'dist', 'bin', 'next');
let app;
const evidence = { project, startedAt: new Date().toISOString(), phases: [] };
async function page(urlPath) {
  const response = await fetch(`${appUrl}${urlPath}`, { signal: AbortSignal.timeout(15000) });
  return { status: response.status, html: await response.text(), cache: response.headers.get('cache-control') };
}
async function eventually(label, check) {
  const started = Date.now();
  let detail;
  while (Date.now() - started < 240000) {
    try { detail = await check(); } catch (error) { detail = { ok: false, error: error.message }; }
    if (detail.ok) {
      const result = { label, seconds: Math.round((Date.now() - started) / 1000), ...detail };
      evidence.phases.push(result); console.log(JSON.stringify(result)); return;
    }
    if (Math.round((Date.now() - started) / 1000) % 15 < 5) console.log(JSON.stringify({ waiting: label, seconds: Math.round((Date.now() - started) / 1000), ...detail }));
    await delay(5000);
  }
  throw new Error(`${label}: timeout ${JSON.stringify(detail)}`);
}
try {
  console.log('Building isolated Next production app against local test CMS.');
  const build = spawn(process.execPath, [cli, 'build'], { cwd: project, env, stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => { build.on('error', reject); build.on('exit', resolve); });
  assert.equal(code, 0, 'isolated production build');
  const buildId = (await readFile(path.join(project, '.next', 'BUILD_ID'), 'utf8')).trim();
  evidence.buildId = buildId;
  app = spawn(process.execPath, [cli, 'start', '-H', '127.0.0.1', '-p', String(appPort)], { cwd: project, env, stdio: 'inherit', windowsHide: true });
  await eventually('startup', async () => ({ ok: (await page('/blog/')).status === 200 }));
  assert.equal((await page('/blog/not-published-yet/')).status, 404);
  const rootMap = await page('/sitemap.xml');
  assert.equal(rootMap.status, 200); assert(!rootMap.html.includes('<lastmod>'));
  assert.equal((await page('/sitemap/99.xml')).status, 404);
  const fresh = { ...seed, id: 'late-post', slug: 'published-after-build', title: 'Статья после сборки', html: '<h2 id="version">Редакция AFTER_BUILD_V1</h2><p>Этой статьи не было во время сборки.</p>', published_at: '2026-09-06T01:02:03.000Z', updated_at: '2026-09-06T01:02:03.000Z', tags: [...seed.tags, { id: 'new-tag', name: 'Публикация QA', slug: 'publikatsiya-qa' }] };
  // Prime the unknown slug too, so a cached miss cannot hide a later publication.
  assert.equal((await page(`/blog/${fresh.slug}/`)).status, 404);
  posts = [fresh, seed];
  const surfaces = async (marker, present) => {
    const [article, blog, rss, sitemap, tag, home] = await Promise.all([`/blog/${fresh.slug}/`, '/blog/', '/rss.xml', '/sitemap/4.xml', '/blog/tag/publikatsiya-qa/', '/'].map(page));
    const checks = {
      article: present ? article.status === 200 && article.html.includes(marker) : article.status === 404,
      blog: blog.html.includes(`/blog/${fresh.slug}/`) === present,
      rss: present ? rss.html.includes(marker) : !rss.html.includes(`/blog/${fresh.slug}/`),
      sitemap: sitemap.html.includes(`/blog/${fresh.slug}/`) === present,
      tag: present ? tag.status === 200 && tag.html.includes('noindex') : tag.status === 404,
      // Homepage supplies the article catalogue to search, not a visible feed.
      homeSearchData: home.html.includes(fresh.slug) === present,
    };
    if (present && checks.article) {
      checks.canonical = article.html.includes(`<link rel="canonical" href="${appUrl}/blog/${fresh.slug}/"`);
      checks.largePreview = article.html.includes('max-image-preview:large');
      checks.timestamp = article.html.includes(fresh.published_at);
    }
    return { ok: Object.values(checks).every(Boolean), checks, cache: { article: article.cache, rss: rss.cache, sitemap: sitemap.cache } };
  };
  await eventually('publish after build', () => surfaces('AFTER_BUILD_V1', true));
  fresh.html = '<h2 id="version">Редакция AFTER_BUILD_V2</h2><p>Правка в тот же день.</p>';
  fresh.updated_at = '2026-09-06T02:03:04.000Z';
  await eventually('edit without build', async () => {
    const result = await surfaces('AFTER_BUILD_V2', true);
    const sitemap = await page('/sitemap/4.xml');
    result.checks.updatedTimestamp = sitemap.html.includes(fresh.updated_at);
    result.ok &&= result.checks.updatedTimestamp;
    return result;
  });
  posts = [seed];
  await eventually('unpublish without build', () => surfaces('', false));
  const invalidation = async (authorization) => fetch(`${appUrl}/api/blog/revalidate`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization },
    body: JSON.stringify({ event: 'published', postId: fresh.id, revision: fresh.updated_at, slug: fresh.slug }),
    signal: AbortSignal.timeout(15000),
  });
  assert.equal((await invalidation('Bearer invalid')).status, 401);
  posts = [fresh, seed];
  const accepted = await invalidation(`Bearer ${testSecret}`);
  assert.equal(accepted.status, 200);
  assert.deepEqual(await accepted.json(), { accepted: true, publicReady: false });
  await eventually('authenticated event refresh', () => surfaces('AFTER_BUILD_V2', true));
  cmsUnavailable = true;
  assert.equal((await invalidation(`Bearer ${testSecret}`)).status, 200);
  const [failedBlog, failedRss] = await Promise.all(['/blog/', '/rss.xml'].map(page));
  assert.equal(failedBlog.status, 500, 'CMS outage must not become a successful empty blog');
  assert.equal(failedRss.status, 500, 'CMS outage must not become a successful empty feed');
  evidence.phases.push({ label: 'CMS outage after invalidation', ok: true, blog: failedBlog.status, rss: failedRss.status });
  cmsUnavailable = false;
  assert.equal((await readFile(path.join(project, '.next', 'BUILD_ID'), 'utf8')).trim(), buildId);
  evidence.cmsReads = cmsReads; evidence.finishedAt = new Date().toISOString();
  await mkdir(path.join(project, '..', 'evidence'), { recursive: true });
  await writeFile(path.join(project, '..', 'evidence', 'lifecycle.json'), JSON.stringify(evidence, null, 2));
  console.log('PASS: published, edited and unpublished without rebuild; evidence saved.');
} finally {
  app?.kill();
  cms.closeAllConnections();
  await new Promise(resolve => cms.close(resolve));
}
