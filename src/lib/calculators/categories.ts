import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "foundation",
    label: "Фундамент и основание",
    slug: "fundament",
    color: "#4338CA",
    bgColor: "#EDE9FE",
    icon: "foundation",
    description: "Расчёт бетона, арматуры, опалубки для фундаментов",
    seoSubject: "фундамента",
    metaDescription: "Бесплатные калькуляторы фундамента: бетон, арматура, ленточный и плитный фундамент, отмостка, подвал. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "walls",
    label: "Стены и перегородки",
    slug: "steny",
    color: "#0F766E",
    bgColor: "#CCFBF1",
    icon: "walls",
    description: "Кирпич, газоблок, гипсокартон, штукатурка",
    seoSubject: "стен и перегородок",
    metaDescription: "Бесплатные калькуляторы стен: кирпич и кладка, газобетон, пеноблоки, гипсокартон, штукатурка, каркасный дом. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "flooring",
    label: "Полы и напольные покрытия",
    slug: "poly",
    color: "#B45309",
    bgColor: "#FEF3C7",
    icon: "flooring",
    description: "Плитка, ламинат, паркет, стяжка, тёплый пол",
    seoSubject: "пола",
    metaDescription: "Бесплатные калькуляторы пола: плитка и клей, ламинат, паркет, линолеум, стяжка, наливной пол, тёплый пол. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "roofing",
    label: "Кровля и водосток",
    slug: "krovlya",
    // #B91C1C (red-700) вместо #DC2626 (red-600) — для контраста ≥4.5:1 на bgColor #FEE2E2
    // (требование WCAG AA для accessibility-аудита Lighthouse).
    color: "#B91C1C",
    bgColor: "#FEE2E2",
    icon: "roofing",
    description: "Металлочерепица, профнастил, ондулин, водосток",
    seoSubject: "кровли",
    metaDescription: "Бесплатные калькуляторы кровли: металлочерепица, профнастил, ондулин, мягкая кровля, водосток и снегозадержание. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "facade",
    label: "Фасад и наружная отделка",
    slug: "fasad",
    color: "#6D28D9",
    bgColor: "#EDE9FE",
    icon: "facade",
    description: "Сайдинг, фасадные панели, мокрый фасад",
    seoSubject: "фасада",
    metaDescription: "Бесплатные калькуляторы фасада: сайдинг, фасадные панели, утепление минватой, облицовочный кирпич, забор. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "engineering",
    label: "Инженерные системы",
    slug: "inzhenernye",
    color: "#0E7490",
    bgColor: "#CFFAFE",
    icon: "engineering",
    description: "Тёплый пол, отопление, электрика, вентиляция",
    seoSubject: "инженерных систем",
    metaDescription: "Бесплатные калькуляторы инженерных систем: тёплый пол, радиаторы отопления, электрика, вентиляция, септик, дренаж. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "interior",
    label: "Внутренняя отделка",
    slug: "otdelka",
    color: "#047857",
    bgColor: "#D1FAE5",
    icon: "interior",
    description: "Краска, обои, плитка, декоративная штукатурка",
    seoSubject: "внутренней отделки",
    metaDescription: "Бесплатные калькуляторы отделки: краска, обои, плитка, штукатурка, шпаклёвка, декоративный камень, окна и двери. Расход материалов, запас и итог к покупке.",
  },
  {
    id: "ceiling",
    label: "Потолки",
    slug: "potolki",
    color: "#1D4ED8",
    bgColor: "#DBEAFE",
    icon: "ceiling",
    description: "Натяжные, реечные, гипсокартон, покраска",
    seoSubject: "потолков",
    metaDescription: "Бесплатные калькуляторы потолков: натяжные и реечные потолки, кассетные системы, гипсокартон, утепление. Расход материалов, запас и итог к покупке.",
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  CATEGORIES.find((c) => c.slug === slug);

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);
