#!/usr/bin/env node
/**
 * IndexNow ping для уведомления Bing, Yandex, Naver, Seznam.cz, Yep
 * о свежем деплое. Заменил deprecated Google sitemap ping endpoint
 * (который вернул 404 в июне 2023 — см. PR #38 commit message).
 *
 * Google сам IndexNow не поддерживает (на 2026), но у нас половина
 * трафика из Yandex — для Yandex это критично. Один POST → все
 * IndexNow-engines получают уведомление через shared protocol.
 *
 * Документация: https://www.indexnow.org/
 *
 * Что отправляем: главную и реестр калькуляторов как entry points.
 * Бот сам пройдёт по sitemap.xml оттуда. Слать все 200+ URL за раз
 * не нужно — IndexNow для этого работает с lastmod в sitemap.
 *
 * Поведение при ошибке: just log, не падаем (это postbuild,
 * деплой не должен ломаться из-за временного отказа IndexNow).
 */

const KEY = "68e301592b07e1004225bfcc25ae3803";
const HOST = "getmasterok.ru";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const URL_LIST = [
  `https://${HOST}/`,
  `https://${HOST}/kalkulyatory/`,
  `https://${HOST}/blog/`,
  `https://${HOST}/instrumenty/`,
];

async function pingIndexNow() {
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: URL_LIST,
      }),
    });
    if (res.ok) {
      console.log(`✓ IndexNow ping accepted (HTTP ${res.status}) — уведомлены Bing, Yandex и др.`);
    } else if (res.status === 422) {
      // 422 = валидационная ошибка (обычно ключ ещё не опубликован).
      // Не критично, просто залогируем.
      console.warn(`⚠ IndexNow вернул 422 — проверь что ${KEY_LOCATION} доступен`);
    } else {
      console.warn(`⚠ IndexNow ping вернул HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`⚠ IndexNow ping не отправлен: ${err.message}`);
  }
}

pingIndexNow();
