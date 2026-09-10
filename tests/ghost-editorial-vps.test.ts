import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const h = require('../scripts/ghost-editorial-vps.cjs');
const folders: string[] = [];
const origin = 'https://cms.getmasterok.ru';
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'masterok-editorial-test-'));
  folders.push(root);
  fs.mkdirSync(path.join(root, 'images'));
  fs.writeFileSync(path.join(root, 'images', 'feature.webp'), 'RIFF0000WEBPtest fixture');
  const bundle = {
    metadata: { title: 'Тест', slug: 'new-post', tags: [{ name: 'Плитка' }], feature_image: './images/feature.webp' },
    html: '<p>' + 'Reviewed content. '.repeat(30) + '</p><img src="./images/feature.webp" alt="Test">',
    assetPaths: ['./images/feature.webp'],
  };
  const file = path.join(root, 'bundle.json');
  fs.writeFileSync(file, JSON.stringify(bundle));
  return { root, file, bundle };
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => {
  for (const folder of folders.splice(0)) {
    const target = path.resolve(folder);
    if (path.dirname(target) !== path.resolve(os.tmpdir()) || !path.basename(target).startsWith('masterok-editorial-test-')) throw Error('Unsafe test cleanup');
    fs.rmSync(target, { recursive: true });
  }
});
describe('Ghost editorial VPS helper', () => {
  it('requires one operation and an explicit integration before accessing DB', () => {
    expect(() => h.parseArgs([])).toThrow('usage');
    expect(() => h.parseArgs(['--draft', 'bundle.json'])).toThrow('integration');
    expect(() => h.parseArgs(['--inspect', '--publish', 'slug'])).toThrow('usage');
    expect(h.parseArgs(['--inspect'])).toEqual({ inspect: true });
    expect(() => h.parseArgs(['--review-post', 'slug', '--revise', 'file'])).toThrow('usage');
  });
  it('revises only matched text at the reviewed version and preserves media', async () => {
    const { root } = fixture();
    const html = '<p>' + 'Existing article. '.repeat(30) + '</p><figure><img src="https://cms.getmasterok.ru/content/a.webp"><figcaption>Caption</figcaption></figure>';
    const post = { id: 'id', slug: 'old-post', status: 'published', visibility: 'public', html,
      updated_at: '2026-09-10T01:00:00Z', published_at: '2026-02-14T00:00:00Z', feature_image: origin + '/content/cover.webp' };
    const revision = { slug: post.slug, expectedUpdatedAt: post.updated_at,
      expectedHtmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
      replacements: [{ before: '<p>', after: '<p>Correction. ' }] };
    expect(h.revisedHtml(post, revision)).toContain('<p>Correction. ');
    const wrapped = '\n<!--kg-card-begin: html-->\n' + html + '\n<!--kg-card-end: html-->\n';
    expect(h.revisedHtml({ ...post, html: wrapped }, { ...revision,
      expectedHtmlSha256: crypto.createHash('sha256').update(wrapped).digest('hex'),
    })).toBe(h.revisedHtml(post, revision));
    expect(() => h.card(wrapped)).toThrow('html');
    expect(() => h.revisedHtml({ ...post, updated_at: 'newer' }, revision)).toThrow('revision_conflict');
    expect(() => h.revisedHtml(post, { ...revision, expectedHtmlSha256: 'bad' })).toThrow('revision_conflict');
    expect(() => h.revisedHtml(post, { ...revision, replacements: [{ before: 'Existing', after: 'New' }] })).toThrow('revision_match');
    expect(() => h.revisedHtml(post, { ...revision, replacements: [{ before: 'Caption', after: 'Different' }] })).toThrow('revision_media');
    expect(() => h.revisedHtml(post, { ...revision, replacements: [{ before: '<p>', after: '<script>bad</script><p>' }] })).toThrow('html');
    const file = path.join(root, 'revision.json');
    fs.writeFileSync(file, JSON.stringify(revision));
    let writes = 0;
    const mock = async (url: string, init: RequestInit) => {
      if (url.includes('/slug/')) return response({ posts: [post] });
      writes++;
      expect(url).toContain('source=html&save_revision=true');
      const payload = JSON.parse(String(init.body)).posts[0];
      expect(Object.keys(payload).sort()).toEqual(['html', 'id', 'updated_at']);
      expect(payload.html).toContain('kg-card-begin:html');
      expect(JSON.parse(fs.readFileSync(file + '.before.json', 'utf8'))).toEqual(post);
      return response({ posts: [{ ...post, updated_at: 'newer' }] });
    };
    expect((await h.revise('test', file, mock)).status).toBe('published');
    await expect(h.revise('test', file, mock)).rejects.toThrow();
    expect(writes).toBe(1);
  });
  it('replaces a reviewed published article with an audited bundle and uploads its media', async () => {
    const { file, bundle } = fixture();
    const html = '<p>' + 'Old article. '.repeat(30) + '</p>';
    const post = { id: 'id', slug: bundle.metadata.slug, status: 'published', visibility: 'public', html,
      updated_at: '2026-09-10T01:00:00Z', published_at: '2026-02-14T00:00:00Z', feature_image: origin + '/content/old.webp',
      canonical_url: 'https://getmasterok.ru/blog/new-post/' };
    fs.writeFileSync(file, JSON.stringify({ ...bundle, revision: { updatedAt: post.updated_at,
      htmlSha256: crypto.createHash('sha256').update(html).digest('hex') } }));
    const uploaded = origin + '/content/images/replacement.webp';
    let writes = 0;
    const mock = async (url: string, init: RequestInit) => {
      if (url.includes('/slug/')) return response({ posts: [post] });
      if (url.includes('/images/upload/')) return response({ images: [{ url: uploaded }] });
      writes++;
      const payload = JSON.parse(String(init.body)).posts[0];
      expect(payload.status).toBe('published');
      expect(payload.feature_image).toBe(uploaded);
      expect(payload.html).toContain(uploaded);
      expect(JSON.parse(fs.readFileSync(file + '.before.json', 'utf8'))).toEqual(post);
      return response({ posts: [{ ...post, ...payload, updated_at: 'newer', feature_image: uploaded }] });
    };
    expect((await h.replacePublished('test', file, mock)).uploaded).toBe(1);
    expect(writes).toBe(1);
  });
  it('returns null only for absent slug; no fake absence on auth failure', async () => {
    expect(await h.postForSlug('test', 'new-post', async () => response({}, 404))).toBeNull();
    await expect(h.postForSlug('test', 'new-post', async () => response({}, 403))).rejects.toThrow('http_403');
  });
  it('preflights every file before uploads and rejects paths outside bundle', () => {
    const { root } = fixture();
    expect(h.preflight(root, ['./images/feature.webp'])).toHaveLength(1);
    expect(() => h.preflight(root, ['./images/feature.webp', './images/missing.webp'])).toThrow();
    expect(() => h.preflight(root, ['../outside.webp'])).toThrow('asset_path');
  });
  it('creates only a draft; preserves HTML card and maps cover/social/content assets', async () => {
    const { file } = fixture();
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const uploaded = origin + '/content/images/feature.webp';
    const mock = async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('/slug/')) return response({}, 404);
      if (url.includes('/images/upload/')) return response({ images: [{ url: uploaded }] });
      const post = JSON.parse(String(init.body)).posts[0];
      expect(post.status).toBe('draft');
      expect(post.visibility).toBe('public');
      expect(post.canonical_url).toBe('https://getmasterok.ru/blog/new-post/');
      expect([post.feature_image, post.og_image, post.twitter_image]).toEqual([uploaded, uploaded, uploaded]);
      expect(post.html).toContain('kg-card-begin:html');
      expect(post.html).toContain(uploaded);
      expect(post.html).not.toContain('./images/');
      return response({ posts: [{ ...post, id: 'post-id' }] });
    };
    expect((await h.createDraft('test', file, mock)).uploaded).toBe(1);
    expect(calls).toHaveLength(3);
    expect(calls.every(call => call.init.redirect === 'error' && call.init.signal)).toBe(true);
    expect(calls.some(call => /newsletter|email/.test(call.url))).toBe(false);
  });
  it('never overwrites existing slug or retries an uncertain creation', async () => {
    const { file } = fixture();
    let calls = 0;
    const result = await h.createDraft('test', file, async () => {
      calls++; return response({ posts: [{ id: 'existing', slug: 'new-post', status: 'published' }] });
    });
    expect(calls).toBe(1);
    expect(result.existing).toBe(true);
    let requests = 0;
    await expect(h.request('test', '/posts/', { method: 'POST' }, async () => { requests++; throw Error('timeout'); })).rejects.toThrow('network');
    expect(requests).toBe(1);
  });
  it('whitelists metadata and rejects invalid HTML/publish gate', () => {
    const metadata = h.metadata({ title: 'T', slug: 'new-post', tags: [{ name: 'Плитка' }], published_at: 'past', email_only: true, status: 'published' });
    expect(metadata).not.toHaveProperty('email_only');
    expect(metadata).not.toHaveProperty('published_at');
    expect(metadata.status).toBe('draft');
    expect(() => h.card('<script>alert(1)</script>' + 'x'.repeat(400))).toThrow('html');
    expect(() => h.publishReady({ status: 'draft' })).toThrow('draft_not_ready');
  });
  it('publishes site-only after canonical/public/image gates and sends updated_at', async () => {
    const draft = { id: 'id', slug: 'new-post', status: 'draft', title: 'T', html: '<p>Body</p>',
      tags: [{ name: 'Плитка' }], visibility: 'public', feature_image: origin + '/content/images/a.webp',
      canonical_url: 'https://getmasterok.ru/blog/new-post/', updated_at: '2026-09-06T00:00:00Z' };
    let writes = 0;
    const result = await h.publish('test', 'new-post', async (url: string, init: RequestInit) => {
      if (url.includes('/slug/')) return response({ posts: [draft] });
      writes++;
      expect(init.method).toBe('PUT');
      expect(JSON.parse(String(init.body))).toEqual({ posts: [{ id: 'id', status: 'published', updated_at: draft.updated_at }] });
      expect(url).not.toMatch(/newsletter|email/);
      return response({ posts: [{ ...draft, status: 'published' }] });
    });
    expect(result.status).toBe('published');
    expect(writes).toBe(1);
    expect(() => h.publishReady({ ...draft, canonical_url: 'https://example.com' })).toThrow('draft_not_ready');
  });
});
