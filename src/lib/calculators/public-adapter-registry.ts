/**
 * Публичные web-адаптеры, чья formula_version пока отличается от canonical-спеки.
 *
 * Это явная очередь синхронизации, а не разрешение на постоянное расхождение.
 * Новый slug нельзя добавить сюда без отдельного решения о том, какая версия
 * является источником истины. Удалять slug следует только после переноса логики
 * в canonical/engine и зелёного public-adapter-contract.test.ts.
 */
export const PUBLIC_ADAPTER_RECONCILIATION_QUEUE = [
  "penobloki",
  "parket",
  "linoleum",
  "nalivnoy-pol",
  "natyazhnoj-potolok",
  "reechnyj-potolok",
  "kassetnyi-potolok",
  "sayding",
  "zabor",
  "kalkulyator-terrasnoy-doski",
  "trotuarnaya-plitka",
  "gazon",
  "drenazh-uchastka",
  "oboi",
  "gruntovka",
  "shpaklevka",
  "gidroizolyaciya-vlagozaschita",
  "ustanovka-dverej",
  "ustanovka-okon",
  "otkosy-okon-i-dverej",
  "zvukoizolyaciya",
  "otdelka-balkona",
  "otdelka-mansardy",
  "vannaya-komnata",
  "krepezh",
] as const;

export type PublicAdapterReconciliationSlug =
  (typeof PUBLIC_ADAPTER_RECONCILIATION_QUEUE)[number];
