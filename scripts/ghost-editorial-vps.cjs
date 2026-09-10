#!/usr/bin/env node
// Operator-only Ghost VPS utility. Existing integration keys stay in server memory.
// https://docs.ghost.org/admin-api/posts/creating-a-post
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const ORIGIN = 'https://cms.getmasterok.ru';
const ADMIN = ORIGIN + '/ghost/api/admin';
const SITE = 'https://getmasterok.ru';
const ALLOWED = new Set(['title', 'slug', 'custom_excerpt', 'meta_title', 'meta_description',
  'feature_image_alt', 'feature_image_caption', 'tags', 'feature_image', 'og_image', 'twitter_image']);

function validSlug(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw Error('slug');
  return value;
}
function parseArgs(argv) {
  const result = {};
  const names = { '--draft': 'draft', '--publish': 'publish', '--inspect-post': 'inspectPost', '--review-post': 'reviewPost', '--revise': 'revise', '--replace': 'replace', '--integration': 'integration' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--inspect') { result.inspect = true; continue; }
    const key = names[argv[i]];
    if (!key || !argv[i + 1] || argv[i + 1].startsWith('--') || result[key]) throw Error('usage');
    result[key] = argv[++i];
  }
  if ([result.inspect, result.draft, result.publish, result.inspectPost, result.reviewPost, result.revise, result.replace].filter(Boolean).length !== 1) throw Error('usage');
  if (!result.inspect && !/^[a-f0-9]{24}$/.test(result.integration || '')) throw Error('integration');
  return result;
}
function jwt(kid, secret) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = encode({ alg: 'HS256', typ: 'JWT', kid });
  const body = encode({ iat: now, exp: now + 300, aud: '/admin/' });
  const unsigned = head + '.' + body;
  return unsigned + '.' + crypto.createHmac('sha256', Buffer.from(secret, 'hex')).update(unsigned).digest('base64url');
}
function card(html) {
  if (typeof html !== 'string' || html.length < 300 || /<script\b|<iframe\b|kg-card-(begin|end):\s*html/i.test(html)) throw Error('html');
  return '<!--kg-card-begin:html-->' + html + '<!--kg-card-end:html-->';
}
function preflight(root, assets) {
  if (!Array.isArray(assets) || !assets.length || assets.length > 10 || new Set(assets).size !== assets.length) throw Error('assets');
  const base = fs.realpathSync(root);
  return assets.map(rel => {
    if (typeof rel !== 'string' || path.isAbsolute(rel) || !rel.startsWith('./images/') || !/\.webp$/.test(rel)) throw Error('asset_path');
    const real = fs.realpathSync(path.resolve(base, rel));
    const relative = path.relative(base, real);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('asset_path');
    const stat = fs.statSync(real);
    if (!stat.isFile() || stat.size < 12 || stat.size > 5000000) throw Error('asset_path');
    const bytes = fs.readFileSync(real);
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error('asset_path');
    return { rel, real, bytes };
  });
}
function rewrite(value, mappings) {
  return mappings.reduce((value, [before, after]) => value.split(before).join(after), value);
}
function metadata(input) {
  const result = Object.fromEntries(Object.entries(input || {}).filter(([key]) => ALLOWED.has(key)));
  if (!result.title?.trim() || !Array.isArray(result.tags) || !result.tags.length ||
      result.tags.some(tag => typeof tag?.name !== 'string' || !tag.name.trim())) throw Error('metadata');
  result.slug = validSlug(result.slug);
  result.canonical_url = SITE + '/blog/' + result.slug + '/';
  result.status = 'draft';
  result.visibility = 'public';
  return result;
}
async function request(token, endpoint, init = {}, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(ADMIN + endpoint, {
      ...init, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { ...init.headers, Accept: 'application/json', 'Accept-Version': 'v6.0', Authorization: 'Ghost ' + token },
    });
  } catch { throw Error('network'); }
  if (!response.ok) throw Error('http_' + response.status);
  try { return await response.json(); } catch { throw Error('invalid_json'); }
}
async function postForSlug(token, slug, fetcher) {
  try { return (await request(token, '/posts/slug/' + validSlug(slug) + '/?formats=html', {}, fetcher)).posts?.[0] || null; }
  catch (error) { if (error.message === 'http_404') return null; throw error; }
}
function publishReady(post) {
  if (!post || post.status !== 'draft' || !post.title?.trim() || !post.html?.trim() || post.visibility !== 'public' ||
      !Array.isArray(post.tags) || !post.tags.some(tag => !tag.name.startsWith('#')) ||
      !post.feature_image?.startsWith(ORIGIN + '/content/') ||
      post.canonical_url !== SITE + '/blog/' + validSlug(post.slug) + '/' ||
      /(?:src=["'])\.\//.test(post.html) || !post.updated_at) throw Error('draft_not_ready');
}
function publicSummary(post) {
  return { id: post.id, slug: post.slug, status: post.status, url: post.url, canonical_url: post.canonical_url,
    title: post.title, feature_image: post.feature_image, tags: post.tags?.map(tag => tag.name),
    htmlLength: post.html?.length, published_at: post.published_at, updated_at: post.updated_at };
}
async function dbKey(integration, inspect) {
  const ghostRequire = createRequire('/var/www/ghost/current/package.json');
  const knex = ghostRequire('knex');
  const config = JSON.parse(fs.readFileSync('/var/www/ghost/config.production.json', 'utf8'));
  const db = knex({ ...config.database, client: 'mysql2', log: { error() {}, warn() {}, debug() {}, deprecate() {} } });
  try {
    const query = db('api_keys').join('integrations', 'api_keys.integration_id', 'integrations.id').where('api_keys.type', 'admin');
    if (inspect) return { db, rows: await query.select('integrations.id', 'integrations.name') };
    const key = await query.where('integrations.id', integration).select('api_keys.id as key_id', 'api_keys.secret').first();
    if (!key) throw Error('integration');
    return { db, key };
  } catch (error) { await db.destroy(); throw error; }
}
async function createDraft(token, filename, fetcher = fetch) {
  const file = path.resolve(filename);
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  const meta = metadata(bundle.metadata);
  card(bundle.html);
  const assets = preflight(path.dirname(file), bundle.assetPaths);
  if (!assets.some(asset => asset.rel === meta.feature_image)) throw Error('feature_image');
  const existing = await postForSlug(token, meta.slug, fetcher);
  if (existing) return { ...publicSummary(existing), existing: true };
  const mappings = [];
  for (const asset of assets) {
    const form = new FormData();
    form.append('file', new Blob([asset.bytes], { type: 'image/webp' }), path.basename(asset.real));
    form.append('ref', asset.rel);
    const image = (await request(token, '/images/upload/', { method: 'POST', body: form }, fetcher)).images?.[0];
    if (!image?.url?.startsWith(ORIGIN + '/content/')) throw Error('upload_invalid');
    mappings.push([asset.rel, image.url]);
  }
  for (const field of ['feature_image', 'og_image', 'twitter_image']) meta[field] = rewrite(meta[field] || meta.feature_image, mappings);
  const html = rewrite(bundle.html, mappings);
  if (/src=["']\.\//.test(html)) throw Error('unmapped_image');
  // No automatic POST retry. On an uncertain response inspect the slug before any retry.
  const post = (await request(token, '/posts/?source=html', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ ...meta, html: card(html) }] }),
  }, fetcher)).posts?.[0];
  if (!post || post.slug !== meta.slug || post.status !== 'draft') throw Error('post_invalid');
  return { ...publicSummary(post), uploaded: mappings.length };
}
async function publish(token, slug, fetcher = fetch) {
  const post = await postForSlug(token, slug, fetcher);
  publishReady(post);
  const result = (await request(token, '/posts/' + post.id + '/', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ id: post.id, status: 'published', updated_at: post.updated_at }] }),
  }, fetcher)).posts?.[0];
  if (result?.status !== 'published') throw Error('publish_invalid');
  return publicSummary(result);
}
function unwrapHtmlCard(html) {
  return html.replace(/^\s*<!--kg-card-begin:\s*html-->\s*([\s\S]*?)\s*<!--kg-card-end:\s*html-->\s*$/, '$1');
}
function revisedHtml(post, revision) {
  if (!post || post.status !== 'published' || post.visibility !== 'public' || post.slug !== validSlug(revision.slug) ||
      !post.updated_at || revision.expectedUpdatedAt !== post.updated_at ||
      typeof post.html !== 'string' || crypto.createHash('sha256').update(post.html).digest('hex') !== revision.expectedHtmlSha256) throw Error('revision_conflict');
  if (!Array.isArray(revision.replacements) || !revision.replacements.length || revision.replacements.length > 100) throw Error('revision_invalid');
  let html = post.html;
  for (const edit of revision.replacements) {
    if (typeof edit.before !== 'string' || !edit.before || typeof edit.after !== 'string' ||
        html.split(edit.before).length !== 2) throw Error('revision_match');
    html = html.replace(edit.before, () => edit.after);
  }
  html = unwrapHtmlCard(html);
  card(html); // Reject executable markup and nested HTML-card wrappers.
  // Editorial text changes must preserve existing media markup, including captions.
  const figures = value => value.match(/<figure\b[^>]*>[\s\S]*?<\/figure>|<img\b[^>]*>/gi) || [];
  if (JSON.stringify(figures(post.html)) !== JSON.stringify(figures(html)) || html === post.html) throw Error('revision_media');
  return html;
}
async function revise(token, filename, fetcher = fetch) {
  const revision = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const post = await postForSlug(token, validSlug(revision.slug), fetcher);
  const html = revisedHtml(post, revision);
  // Exclusive backup before the only write; a retry requires fresh inspection.
  fs.writeFileSync(filename + '.before.json', JSON.stringify(post), { flag: 'wx', mode: 0o600 });
  const result = (await request(token, '/posts/' + post.id + '/?source=html&save_revision=true', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ id: post.id, updated_at: post.updated_at, html: card(html) }] }),
  }, fetcher)).posts?.[0];
  if (!result || result.id !== post.id || result.slug !== post.slug || result.status !== 'published' ||
      result.published_at !== post.published_at || result.feature_image !== post.feature_image) throw Error('revision_result');
  return publicSummary(result);
}
async function replacePublished(token, filename, fetcher = fetch) {
  const file = path.resolve(filename);
  const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
  const meta = metadata(bundle.metadata);
  const post = await postForSlug(token, meta.slug, fetcher);
  const expected = bundle.revision;
  if (!post || post.status !== 'published' || post.visibility !== 'public' || !post.updated_at ||
      !expected || expected.updatedAt !== post.updated_at ||
      expected.htmlSha256 !== crypto.createHash('sha256').update(post.html || '').digest('hex')) throw Error('revision_conflict');
  card(bundle.html);
  const assets = preflight(path.dirname(file), bundle.assetPaths);
  if (!assets.some(asset => asset.rel === meta.feature_image)) throw Error('feature_image');
  const mappings = [];
  for (const asset of assets) {
    const form = new FormData();
    form.append('file', new Blob([asset.bytes], { type: 'image/webp' }), path.basename(asset.real));
    form.append('ref', asset.rel);
    const image = (await request(token, '/images/upload/', { method: 'POST', body: form }, fetcher)).images?.[0];
    if (!image?.url?.startsWith(ORIGIN + '/content/')) throw Error('upload_invalid');
    mappings.push([asset.rel, image.url]);
  }
  for (const field of ['feature_image', 'og_image', 'twitter_image']) meta[field] = rewrite(meta[field] || meta.feature_image, mappings);
  const html = rewrite(bundle.html, mappings);
  if (/src=["']\.\//.test(html)) throw Error('unmapped_image');
  fs.writeFileSync(file + '.before.json', JSON.stringify(post), { flag: 'wx', mode: 0o600 });
  const result = (await request(token, '/posts/' + post.id + '/?source=html&save_revision=true', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ posts: [{ ...meta, id: post.id, status: 'published', updated_at: post.updated_at, html: card(html) }] }),
  }, fetcher)).posts?.[0];
  if (!result || result.id !== post.id || result.slug !== post.slug || result.status !== 'published' ||
      result.published_at !== post.published_at || result.canonical_url !== post.canonical_url ||
      !result.feature_image?.startsWith(ORIGIN + '/content/')) throw Error('revision_result');
  return { ...publicSummary(result), uploaded: mappings.length };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connection = await dbKey(args.integration, args.inspect);
  try {
    if (args.inspect) { console.log(JSON.stringify(connection.rows)); return; }
    const token = jwt(connection.key.key_id, connection.key.secret);
    let result;
    if (args.draft) result = await createDraft(token, args.draft);
    else if (args.publish) result = await publish(token, validSlug(args.publish));
    else if (args.revise) result = await revise(token, args.revise);
    else if (args.replace) result = await replacePublished(token, args.replace);
    else if (args.reviewPost) {
      const post = await postForSlug(token, args.reviewPost);
      if (!post || post.status !== 'published') throw Error('post_invalid');
      result = { ...publicSummary(post), html: post.html, htmlSha256: crypto.createHash('sha256').update(post.html).digest('hex') };
    }
    else { const post = await postForSlug(token, args.inspectPost); result = post ? publicSummary(post) : { found: false }; }
    console.log(JSON.stringify(result));
  } finally { await connection.db.destroy(); }
}
module.exports = { parseArgs, jwt, card, preflight, rewrite, metadata, request, postForSlug, publishReady, createDraft, publish, revisedHtml, revise, replacePublished, unwrapHtmlCard };
if (require.main === module) main().catch(error => {
  const safe = /^(http_\d+|network|invalid_json|slug|assets|asset_path|metadata|integration|usage|html|unmapped_image|upload_invalid|feature_image|post_invalid|draft_not_ready|publish_invalid|revision_conflict|revision_invalid|revision_match|revision_media|revision_result)$/;
  console.error(safe.test(error.message) ? error.message : 'editorial_failed');
  process.exitCode = 1;
});
