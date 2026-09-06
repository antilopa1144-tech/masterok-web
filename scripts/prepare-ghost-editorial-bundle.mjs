// Offline only: turn a reviewed editorial package into a self-contained Ghost bundle.
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import yaml from 'js-yaml';

const filename = path.resolve(process.argv[2] || '');
const source = fs.readFileSync(filename, 'utf8');
const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (!match) throw Error('Missing editorial metadata');
const meta = yaml.load(match[1]);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) throw Error('Invalid slug');
const output = path.resolve('output/ghost-editorial', meta.slug);
const markdown = source.slice(match[0].length);
const assets = new Set([meta.feature_image]);
const text = children => React.Children.toArray(children).map(child => typeof child === 'string' ? child : '').join('');
const html = renderToStaticMarkup(React.createElement(ReactMarkdown, {
  remarkPlugins: [remarkGfm],
  components: {
    h2: ({ children }) => React.createElement('h2', { id: text(children).toLowerCase().replace(/[^а-яёa-z0-9]+/giu, '-').replace(/^-|-$/g, '') }, children),
    a: ({ href, children }) => React.createElement('a', { href: href?.startsWith('/') ? 'https://getmasterok.ru' + href : href }, children),
    img: ({ src, alt }) => { assets.add(src); return React.createElement('img', { src, alt, loading: 'lazy' }); },
    table: ({ children }) => React.createElement('div', { style: { overflowX: 'auto' } }, React.createElement('table', { style: { minWidth: '620px', width: '100%', borderCollapse: 'collapse' } }, children)),
    th: ({ children }) => React.createElement('th', { style: { background: '#17313a', color: '#ffffff', padding: '12px', textAlign: 'left', border: '1px solid #cbd5e1' } }, children),
    td: ({ children }) => React.createElement('td', { style: { padding: '12px', border: '1px solid #cbd5e1' } }, children),
  },
}, markdown));
fs.mkdirSync(output, { recursive: true });
for (const asset of assets) {
  if (!/^\.\/images\/[a-z0-9-]+\.webp$/.test(asset)) throw Error('Invalid local editorial image');
  const destination = path.join(output, asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.resolve(path.dirname(filename), asset), destination);
}
const bundle = {
  metadata: {
    slug: meta.slug, title: meta.title, meta_title: meta.meta_title,
    meta_description: meta.description, custom_excerpt: meta.description,
    feature_image: meta.feature_image, feature_image_alt: meta.feature_image_alt,
    feature_image_caption: meta.feature_image_caption,
    tags: [meta.primary_tag, ...(meta.tags || []), ...(meta.internal_tags || [])].map(name => ({ name })),
  },
  html, assetPaths: [...assets],
};
fs.writeFileSync(path.join(output, 'bundle.json'), JSON.stringify(bundle, null, 2));
console.log(JSON.stringify({ slug: meta.slug, htmlLength: html.length, images: assets.size, output }));
