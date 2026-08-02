#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import process from "node:process";

const SLUG = "skolko-proflista-na-zabor";
const WRONG_CALCULATOR_URL = "https://getmasterok.ru/kalkulyatory/krovlya/krovlya/";
const FENCE_CALCULATOR_URL = "/kalkulyatory/fasad/zabor/";
const QUICK_ANSWER_ID = "skolko-listov-20-30-50";

const TARGET = {
  title: "Сколько профлиста нужно на забор 20, 30 и 50 м",
  meta_title: "Сколько профлиста на забор 20, 30 и 50 м — таблица",
  meta_description:
    "Сколько листов профнастила нужно на забор 20, 30 или 50 м: таблица для С8 и С21, формула по рабочей ширине, учёт ворот и калитки.",
  custom_excerpt:
    "Сколько листов профнастила нужно на забор 20, 30 или 50 м: таблица для С8 и С21, формула по рабочей ширине, учёт ворот и калитки.",
};

const QUICK_ANSWER_HTML = `
<h2 id="${QUICK_ANSWER_ID}">Сколько листов нужно на забор 20, 30 и 50 метров</h2>
<p>Быстрый расчёт ниже сделан для сплошного прямого участка без ворот и калитки. Используется рабочая, а не габаритная ширина листа; количество округлено вверх до целого листа.</p>
<table>
  <thead>
    <tr><th>Длина забора</th><th>С8, рабочая ширина 1,15 м</th><th>С21, рабочая ширина 1,00 м</th></tr>
  </thead>
  <tbody>
    <tr><td>20 м</td><td>18 листов</td><td>20 листов</td></tr>
    <tr><td>30 м</td><td>27 листов</td><td>30 листов</td></tr>
    <tr><td>50 м</td><td>44 листа</td><td>50 листов</td></tr>
  </tbody>
</table>
<p><strong>Важно:</strong> это базовая потребность без дополнительного запаса. Если ворота и калитка входят в общую длину, сначала вычтите ширину проёмов. Рабочую ширину конкретного профлиста возьмите из карточки или паспорта производителя: у разных профилей она отличается.</p>
<p><a href="${FENCE_CALCULATOR_URL}">Рассчитать профлист, столбы, лаги и крепёж в калькуляторе забора</a></p>
`.trim();

loadDotEnv(".env.local");

const write = process.argv.includes("--write");
const ghostUrl = trimTrailingSlash(process.env.GHOST_API_URL ?? "http://5.129.248.119");
const adminKey = process.env.GHOST_ADMIN_API_KEY ?? "";

if (!adminKey) fail("GHOST_ADMIN_API_KEY не задан.");

const post = await fetchPost();
const nextHtml = migrateHtml(post.html ?? "");
const changes = {
  title: post.title !== TARGET.title,
  metaTitle: post.meta_title !== TARGET.meta_title,
  metaDescription: post.meta_description !== TARGET.meta_description,
  excerpt: post.custom_excerpt !== TARGET.custom_excerpt,
  html: nextHtml !== (post.html ?? ""),
};

console.log(JSON.stringify({ slug: SLUG, write, changes }, null, 2));

if (!Object.values(changes).some(Boolean)) {
  console.log("Миграция уже применена.");
  process.exit(0);
}

if (!write) {
  console.log("Dry-run: для записи запустите скрипт с --write.");
  process.exit(0);
}

await updatePost({
  ...TARGET,
  html: nextHtml,
  updated_at: post.updated_at,
});

console.log("Статья обновлена в Ghost.");

function migrateHtml(html) {
  if (!html) fail("Ghost вернул пустой HTML статьи.");

  let next = html.split(WRONG_CALCULATOR_URL).join(FENCE_CALCULATOR_URL);

  if (!next.includes(`id="${QUICK_ANSWER_ID}"`)) {
    const firstHeading = next.search(/<h2(?:\s[^>]*)?>/i);
    if (firstHeading < 0) fail("Не найден первый H2 для вставки таблицы.");
    next = `${next.slice(0, firstHeading)}${QUICK_ANSWER_HTML}\n${next.slice(firstHeading)}`;
  }

  return next;
}

async function fetchPost() {
  const url = new URL(`/ghost/api/admin/posts/slug/${SLUG}/`, ghostUrl);
  url.searchParams.set("formats", "html");
  const response = await fetch(url, {
    headers: { Authorization: `Ghost ${createGhostAdminToken(adminKey)}` },
  });
  if (!response.ok) fail(`Ghost Admin API: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  const result = payload.posts?.[0];
  if (!result) fail(`Статья ${SLUG} не найдена.`);
  return result;
}

async function updatePost(update) {
  const url = new URL(`/ghost/api/admin/posts/${post.id}/`, ghostUrl);
  url.searchParams.set("source", "html");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Ghost ${createGhostAdminToken(adminKey)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ posts: [update] }),
  });
  if (!response.ok) fail(`Ghost Admin API: ${response.status} ${response.statusText}`);
}

function createGhostAdminToken(key) {
  const [id, secret] = key.split(":");
  if (!id || !secret) fail("GHOST_ADMIN_API_KEY должен быть в формате id:secret.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT", kid: id }));
  const payload = base64Url(JSON.stringify({ iat: now, exp: now + 300, aud: "/admin/" }));
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function loadDotEnv(filePath) {
  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
