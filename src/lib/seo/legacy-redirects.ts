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
];
