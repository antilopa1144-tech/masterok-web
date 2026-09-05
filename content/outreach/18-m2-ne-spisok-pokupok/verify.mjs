import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(name, import.meta.url));
const article = read('article.md').toString('utf8');
const rows = article.split('\n').filter(line => /^\| \d+,\d{2} м²/.test(line));
assert.equal(rows.length, 3, 'Expected three packaging examples in the article');
const cents = value => Math.round(Number(value.match(/[\d]+(?:,\d+)?/)[0].replace(',', '.')) * 100);
for (const row of rows) {
  const [needText, packsText, boughtText, leftoverText] = row.split('|').slice(1, 5);
  const need = cents(needText);
  const packs = Number(packsText.trim());
  const bought = cents(boughtText);
  const leftover = cents(leftoverText);
  assert.equal(packs, Math.ceil(need / 220), row);
  assert.equal(bought, packs * 220, row);
  assert.equal(leftover, bought - need, row);
}

const sizes = ['layout-width.png', 'layout-length.png'].map(name => {
  const png = read(name);
  assert.equal(png.subarray(1, 4).toString(), 'PNG', name);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.ok(width >= 1000 && height >= 500, `${name}: ${width}×${height}`);
  return { name, width, height, bytes: png.length };
});
assert.equal(sizes[0].width, sizes[1].width);
assert.equal(sizes[0].height, sizes[1].height);
for (const path of ['./layout-width.png', './layout-length.png']) {
  assert.ok(article.includes(path), `Missing illustration reference: ${path}`);
}
assert.ok(article.includes('Мы представляем проект строительных калькуляторов'));
assert.ok(article.includes('Это учебное число'));
assert.ok(article.includes('не готовая монтажная карта'));
assert.ok(!article.includes('utm_'), 'Keep the editorial source free of campaign parameters');
console.log(JSON.stringify({ packagingExamples: rows.length, images: sizes, status: 'passed' }, null, 2));
