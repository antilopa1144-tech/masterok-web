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
  },
  {
    id: "walls",
    label: "Стены и перегородки",
    slug: "steny",
    color: "#0F766E",
    bgColor: "#CCFBF1",
    icon: "walls",
    description: "Кирпич, газоблок, гипсокартон, штукатурка",
  },
  {
    id: "flooring",
    label: "Полы и напольные покрытия",
    slug: "poly",
    color: "#B45309",
    bgColor: "#FEF3C7",
    icon: "flooring",
    description: "Плитка, ламинат, паркет, стяжка, тёплый пол",
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
  },
  {
    id: "facade",
    label: "Фасад и наружная отделка",
    slug: "fasad",
    color: "#6D28D9",
    bgColor: "#EDE9FE",
    icon: "facade",
    description: "Сайдинг, фасадные панели, мокрый фасад",
  },
  {
    id: "engineering",
    label: "Инженерные системы",
    slug: "inzhenernye",
    color: "#0E7490",
    bgColor: "#CFFAFE",
    icon: "engineering",
    description: "Тёплый пол, отопление, электрика, вентиляция",
  },
  {
    id: "interior",
    label: "Внутренняя отделка",
    slug: "otdelka",
    color: "#047857",
    bgColor: "#D1FAE5",
    icon: "interior",
    description: "Краска, обои, плитка, декоративная штукатурка",
  },
  {
    id: "ceiling",
    label: "Потолки",
    slug: "potolki",
    color: "#1D4ED8",
    bgColor: "#DBEAFE",
    icon: "ceiling",
    description: "Натяжные, реечные, гипсокартон, покраска",
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  CATEGORIES.find((c) => c.slug === slug);

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);
