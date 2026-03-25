import { SITE_FOUNDING_DATE, SITE_NAME, SITE_URL } from "@/lib/site";

interface CalculatorJsonLdProps {
  calc: {
    id: string;
    slug: string;
    title: string;
    h1: string;
    description: string;
    metaTitle: string;
    metaDescription: string;
    category: string;
    categorySlug: string;
    tags: string[];
    popularity: number;
    complexity: number;
    faq?: Array<{ question: string; answer: string }>;
    howToUse?: string[];
    expertTips?: Array<{ title: string; content: string; author?: string }>;
    seoContent?: { descriptionHtml: string; faq: Array<{ question: string; answer: string }> };
  };
  categoryLabel?: string;
  canonicalUrl: string;
}

export function CalculatorJsonLd({ calc, categoryLabel, canonicalUrl }: CalculatorJsonLdProps) {
  // WebApplication schema (enhanced)
  const appLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: calc.title,
    description: calc.metaDescription,
    alternateName: calc.h1,
    url: canonicalUrl,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    inLanguage: "ru",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
    },
    datePublished: SITE_FOUNDING_DATE,
    dateModified: new Date().toISOString().split("T")[0],
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: String(Math.max(50, calc.popularity * 3)),
      bestRating: "5",
      worstRating: "1",
    },
  };

  // BreadcrumbList
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Калькуляторы", item: `${SITE_URL}/kalkulyatory/` },
      ...(categoryLabel ? [{ "@type": "ListItem", position: 3, name: categoryLabel, item: `${SITE_URL}/kalkulyatory/${calc.categorySlug}/` }] : []),
      { "@type": "ListItem", position: categoryLabel ? 4 : 3, name: calc.title },
    ],
  };

  // FAQPage schema (AEO optimized) — merges regular FAQ + seoContent FAQ
  const allFaqItems = [
    ...(calc.faq ?? []),
    ...((calc.seoContent?.faq ?? []).map(item => ({
      question: item.question,
      answer: item.answer.replace(/<[^>]+>/g, ""), // strip HTML for schema
    }))),
  ];
  const faqLd = allFaqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: allFaqItems.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["[data-faq-answer]"],
    },
  } : null;

  // QAPage schema for calculators with 5+ FAQ (better for AI citation engines)
  const qaPageLd = allFaqItems.length >= 5 ? {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: allFaqItems.slice(0, 1).map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
        upvoteCount: 0,
        dateCreated: SITE_FOUNDING_DATE,
        author: { "@type": "Organization", name: SITE_NAME },
      },
    }))[0],
  } : null;

  // HowTo schema
  const howToLd = calc.howToUse && calc.howToUse.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `Как пользоваться: ${calc.title}`,
    description: calc.metaDescription,
    inLanguage: "ru",
    url: canonicalUrl,
    totalTime: "PT3M",
    tool: [{ "@type": "HowToTool", name: "Веб-браузер" }],
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["[data-faq-answer]", ".prose h2", ".prose p"],
    },
    step: calc.howToUse.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Шаг ${i + 1}`,
      text: step,
      url: `${canonicalUrl}#${calc.id}-step-${i + 1}`,
    })),
  } : null;

  // Expert tips as Article snippets for AEO
  const expertTipsLd = calc.expertTips && calc.expertTips.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Советы экспертов: ${calc.title}`,
    description: calc.metaDescription,
    inLanguage: "ru",
    url: canonicalUrl,
    author: calc.expertTips.filter(t => t.author).map(t => ({
      "@type": "Person",
      name: t.author,
    })),
    articleBody: calc.expertTips.map(t => `${t.title}: ${t.content}`).join("\n\n"),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      {qaPageLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qaPageLd) }} />}
      {howToLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />}
      {expertTipsLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(expertTipsLd) }} />}
    </>
  );
}
