export interface LegacyRedirect {
  source: string;
  destination: string;
  permanent: true;
}

/**
 * Старые адреса калькуляторов, которые Google продолжает обходить.
 *
 * Держим карту отдельно от next.config.ts, чтобы переименования slug/category
 * были проверяемыми и не превращались в noindex-404 после миграций.
 */
export const LEGACY_CALCULATOR_REDIRECTS: LegacyRedirect[] = [
  {
    source: "/kalkulyatory/interior/:slug*",
    destination: "/kalkulyatory/otdelka/:slug*",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/wallpaper",
    destination: "/kalkulyatory/otdelka/oboi/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/wallpaper/",
    destination: "/kalkulyatory/otdelka/oboi/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/primer",
    destination: "/kalkulyatory/otdelka/gruntovka/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/primer/",
    destination: "/kalkulyatory/otdelka/gruntovka/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/putty",
    destination: "/kalkulyatory/otdelka/shpaklevka/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/otdelka/putty/",
    destination: "/kalkulyatory/otdelka/shpaklevka/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/fundament/gidroizolyaciya",
    destination: "/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/fundament/gidroizolyaciya/",
    destination: "/kalkulyatory/otdelka/gidroizolyaciya-vlagozaschita/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/steny/gipsokarton-potolok",
    destination: "/kalkulyatory/potolki/podvesnoy-potolok-gkl/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/steny/gipsokarton-potolok/",
    destination: "/kalkulyatory/potolki/podvesnoy-potolok-gkl/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/fasad/zaborny-kalkulyator",
    destination: "/kalkulyatory/fasad/zabor/",
    permanent: true,
  },
  {
    source: "/kalkulyatory/fasad/zaborny-kalkulyator/",
    destination: "/kalkulyatory/fasad/zabor/",
    permanent: true,
  },
];

/**
 * Устаревшие служебные страницы каталога.
 *
 * `/all/` дублировала полный список `/kalkulyatory/`, но не собирала
 * самостоятельный поисковый или пользовательский спрос.
 */
export const LEGACY_CATALOG_REDIRECTS: LegacyRedirect[] = [
  {
    source: "/all",
    destination: "/kalkulyatory/",
    permanent: true,
  },
  {
    source: "/all/",
    destination: "/kalkulyatory/",
    permanent: true,
  },
];
