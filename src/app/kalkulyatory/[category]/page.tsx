import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCalculatorsByCategory } from "@/lib/calculators";
import { CATEGORIES, getCategoryBySlug } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};

  return {
    title: `${cat.label} — строительные калькуляторы онлайн`,
    description: `Бесплатные калькуляторы: ${cat.description.toLowerCase()}. Точный расчёт по ГОСТ.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const calculators = getCalculatorsByCategory(cat.id);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmasterok.ru";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Калькуляторы", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: cat.label },
    ],
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat.label} — строительные калькуляторы`,
    numberOfItems: calculators.length,
    itemListElement: calculators.map((calc, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: calc.title,
      url: `${baseUrl}/kalkulyatory/${cat.slug}/${calc.slug}/`,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      {/* Hero */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="page-container-wide py-8">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-200 no-underline">Калькуляторы</Link>
            <span>›</span>
            <span style={{ color: cat.color }} className="font-medium">{cat.label}</span>
          </nav>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: cat.color + "22" }}
            >
              <CategoryIcon icon={cat.icon} size={28} color={cat.color} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {cat.label}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{cat.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Список калькуляторов */}
      <div className="page-container-wide py-8">
        {calculators.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <p className="text-lg">Калькуляторы этой категории скоро появятся</p>
            <Link href="/" className="btn-secondary mt-4 inline-flex">
              Все калькуляторы
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {calculators.map((calc) => (
              <Link
                key={calc.id}
                href={`/kalkulyatory/${cat.slug}/${calc.slug}/`}
                className="card-hover p-5 block no-underline group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ backgroundColor: cat.color + "18" }}
                >
                  <CategoryIcon icon={cat.icon} size={20} color={cat.color} />
                </div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-accent-600 transition-colors">
                  {calc.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{calc.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {"★".repeat(calc.complexity)}{"☆".repeat(3 - calc.complexity)} сложность
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
