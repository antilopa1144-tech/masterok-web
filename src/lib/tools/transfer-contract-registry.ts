/**
 * Реестр переходов, которые переносят контекст или числовые значения между
 * публичными инструментами и калькуляторами.
 *
 * Сам перенос остаётся в профильном модуле. Реестр нужен как обязательная
 * карта покрытия: у каждого такого модуля должен быть отдельный тест, а все
 * объявленные публичные точки входа должны существовать в каталогах сайта.
 */

export type TransferEndpointKind = "tool" | "calculator";
export type TransferPayloadKind = "values" | "context" | "navigation";

export interface TransferEndpoint {
  kind: TransferEndpointKind;
  slug: string;
}

export interface TransferContractRegistration {
  id: string;
  moduleName: string;
  payload: TransferPayloadKind;
  sources: readonly TransferEndpoint[];
  targets: readonly TransferEndpoint[];
}

const tool = (slug: string): TransferEndpoint => ({ kind: "tool", slug });
const calculator = (slug: string): TransferEndpoint => ({ kind: "calculator", slug });

export const TRANSFER_CONTRACT_REGISTRY = [
  {
    id: "brickwork-layout",
    moduleName: "brickwork-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-kirpicha"), calculator("kirpich"), calculator("kladka-kirpicha")],
    targets: [tool("raskladka-kirpicha"), calculator("kladka-kirpicha")],
  },
  {
    id: "checklist-calculator",
    moduleName: "checklist-calculator-links",
    payload: "navigation",
    sources: [tool("chek-listy")],
    targets: [calculator("plitka"), calculator("styazhka"), calculator("gipsokarton")],
  },
  {
    id: "consumption-norms",
    moduleName: "consumption-norm-links",
    payload: "context",
    sources: [calculator("kraska"), calculator("gruntovka"), calculator("shtukaturka")],
    targets: [tool("normy-raskhoda")],
  },
  {
    id: "curing-timer",
    moduleName: "curing-timer-links",
    payload: "context",
    sources: [calculator("beton"), calculator("styazhka"), calculator("nalivnoy-pol")],
    targets: [tool("tajmer-skhvatyvaniya")],
  },
  {
    id: "deck-layout",
    moduleName: "deck-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-terrasnoy-doski"), calculator("kalkulyator-terrasnoy-doski")],
    targets: [tool("raskladka-terrasnoy-doski"), calculator("kalkulyator-terrasnoy-doski")],
  },
  {
    id: "laminate-layout",
    moduleName: "laminate-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-laminata"), tool("ploshchad-komnaty"), calculator("laminat")],
    targets: [tool("raskladka-laminata"), calculator("laminat")],
  },
  {
    id: "lighting-layout",
    moduleName: "lighting-layout-to-ceiling",
    payload: "values",
    sources: [tool("rasstanovka-svetilnikov"), calculator("natyazhnoj-potolok")],
    targets: [tool("rasstanovka-svetilnikov"), calculator("natyazhnoj-potolok")],
  },
  {
    id: "material-comparison",
    moduleName: "material-comparison-links",
    payload: "context",
    sources: [tool("sravnenie-materialov")],
    targets: [
      calculator("laminat"),
      calculator("linoleum"),
      calculator("plitka"),
      calculator("parket"),
      calculator("oboi"),
      calculator("kraska"),
      calculator("uteplenie"),
      calculator("krovlya"),
    ],
  },
  {
    id: "paver-layout",
    moduleName: "paver-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-trotuarnoy-plitki"), calculator("trotuarnaya-plitka")],
    targets: [tool("raskladka-trotuarnoy-plitki"), calculator("trotuarnaya-plitka")],
  },
  {
    id: "reverse-coverage",
    moduleName: "reverse-coverage-links",
    payload: "context",
    sources: [tool("skolko-ostalos")],
    targets: [
      calculator("kraska"),
      calculator("gruntovka"),
      calculator("shpaklevka"),
      calculator("shtukaturka"),
      calculator("klej-dlya-plitki"),
      calculator("zatirka"),
    ],
  },
  {
    id: "room-renovation-cost",
    moduleName: "room-master-to-renovation-cost",
    payload: "values",
    sources: [tool("moy-remont"), tool("stoimost-remonta")],
    targets: [tool("moy-remont"), tool("stoimost-remonta")],
  },
  {
    id: "sheet-layout",
    moduleName: "sheet-layout-to-calc",
    payload: "values",
    sources: [
      tool("raskladka-listov"),
      calculator("gipsokarton"),
      calculator("podvesnoy-potolok-gkl"),
      calculator("krepezh"),
    ],
    targets: [
      tool("raskladka-listov"),
      calculator("gipsokarton"),
      calculator("podvesnoy-potolok-gkl"),
      calculator("krepezh"),
    ],
  },
  {
    id: "tile-layout",
    moduleName: "tile-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-plitki"), tool("ploshchad-komnaty"), tool("moy-remont"), calculator("plitka")],
    targets: [
      tool("raskladka-plitki"),
      calculator("plitka"),
      calculator("klej-dlya-plitki"),
      calculator("zatirka"),
    ],
  },
  {
    id: "wall-slat-linear-cut",
    moduleName: "wall-slat-to-linear-cut",
    payload: "values",
    sources: [tool("raskladka-reek")],
    targets: [tool("lineynyy-raskroy")],
  },
  {
    id: "wallpaper-layout",
    moduleName: "wallpaper-layout-to-calc",
    payload: "values",
    sources: [tool("raskladka-oboev"), tool("ploshchad-komnaty"), calculator("oboi")],
    targets: [tool("raskladka-oboev"), calculator("oboi")],
  },
] as const satisfies readonly TransferContractRegistration[];
