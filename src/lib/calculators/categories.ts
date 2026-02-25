import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "foundation",
    label: "Фундамент и основание",
    slug: "fundament",
    color: "#6366F1",
    bgColor: "#EDE9FE",
    icon: "foundation",
    description: "Расчёт бетона, арматуры, опалубки для фундаментов",
  },
  {
    id: "walls",
    label: "Стены и перегородки",
    slug: "steny",
    color: "#14B8A6",
    bgColor: "#CCFBF1",
    icon: "walls",
    description: "Кирпич, газоблок, гипсокартон, штукатурка",
  },
  {
    id: "flooring",
    label: "Полы и напольные покрытия",
    slug: "poly",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    icon: "flooring",
    description: "Плитка, ламинат, паркет, стяжка, тёплый пол",
  },
  {
    id: "roofing",
    label: "Кровля и водосток",
    slug: "krovlya",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    icon: "roofing",
    description: "Металлочерепица, профнастил, ондулин, водосток",
  },
  {
    id: "facade",
    label: "Фасад и наружная отделка",
    slug: "fasad",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    icon: "facade",
    description: "Сайдинг, фасадные панели, мокрый фасад",
  },
  {
    id: "engineering",
    label: "Инженерные системы",
    slug: "inzhenernye",
    color: "#06B6D4",
    bgColor: "#CFFAFE",
    icon: "engineering",
    description: "Тёплый пол, отопление, электрика, вентиляция",
  },
  {
    id: "interior",
    label: "Внутренняя отделка",
    slug: "otdelka",
    color: "#10B981",
    bgColor: "#D1FAE5",
    icon: "interior",
    description: "Краска, обои, плитка, декоративная штукатурка",
  },
  {
    id: "ceiling",
    label: "Потолки",
    slug: "potolki",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    icon: "ceiling",
    description: "Натяжные, реечные, гипсокартон, покраска",
  },
];

export const getCategoryBySlug = (slug: string): Category | undefined =>
  CATEGORIES.find((c) => c.slug === slug);

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find((c) => c.id === id);
