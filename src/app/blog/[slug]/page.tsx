import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ALL_CALCULATORS_META, getCalculatorMetaBySlug as getCalculatorBySlug } from "@/lib/calculators/meta.generated";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { buildPageMetadata } from "@/lib/metadata";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import parse from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";

const UI_TEXT = {
  notFoundTitle: "Статья не найдена",
  breadcrumbHome: "Главная",
  breadcrumbBlog: "Блог",
  tagsLabel: "Теги:",
  articleCtaTitle: "Рассчитайте материалы онлайн",
  articleCtaDescription: "Используйте наш калькулятор для точного расчёта по ГОСТ и СНиП",
  allArticles: "← Все статьи",
  allCalculators: "Все калькуляторы",
  calculatorCtaFallback: "Открыть калькулятор",
  relatedPostsTitle: "Читайте также",
  relatedPostsReadMore: "Читать →",
  authorPrefix: "Редакция",
  authorAbout: "о проекте",
  publishedLabel: "Опубликовано",
  updatedLabel: "Обновлено",
  tocTitle: "В этой статье",
  disclaimerText: "Этот материал — справочный. Для серьёзных инженерных решений по фундаменту, несущим конструкциям и инженерным системам обращайтесь к проектировщику. Цифры из статьи можно перепроверить в калькуляторе.",
} as const;

// Дата считается «обновлённой», только если редактирование произошло
// заметно позже публикации — иначе любой клик в Ghost создавал бы видимость
// свежести.
const UPDATED_THRESHOLD_DAYS = 7;

function isMeaningfullyUpdated(published: string, updated?: string): boolean {
  if (!updated || updated === published) return false;
  const p = new Date(published).getTime();
  const u = new Date(updated).getTime();
  if (!Number.isFinite(p) || !Number.isFinite(u)) return false;
  return u - p > UPDATED_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}

function truncateDescription(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.7 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "") + "…";
}

function formatRuDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface TocEntry {
  id: string;
  text: string;
}

/**
 * Извлекает <h2 id="...">текст</h2> из HTML статьи в порядке появления.
 * Ghost генерирует id автоматически (как процент-кодированный кириллицу).
 * Возвращает пустой массив, если заголовков меньше двух (TOC бессмысленен).
 */
function extractToc(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const re = /<h2(?:\s+[^>]*?)?\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (id && text) entries.push({ id, text });
  }
  return entries.length >= 2 ? entries : [];
}

interface Props {
  params: Promise<{ slug: string }>;
}

// dynamicParams: false → неизвестные slug возвращают 404 (через notFound())
export const dynamicParams = false;

// ISR: ревалидация раз в час — для блога статьи могут редактироваться чаще,
// чем калькуляторы (тексты обновляются через Ghost CMS).
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return {
      title: UI_TEXT.notFoundTitle,
      robots: { index: false, follow: false },
    };
  }

  const baseUrl = SITE_URL;
  // Display H1 (post.title) — авторский, иногда длинный («…золотую середину…»).
  // <title> для поиска используем короткий meta_title из Ghost, если редактор задал.
  const seoTitle = post.metaTitle ?? post.title;
  // Google показывает ~155-160 символов description; длинные обрезает с многоточием.
  // Авторские excerpt в Ghost иногда выходят 230+ — режем по словам.
  const description = truncateDescription(post.description, 158);
  const canonicalUrl = `${baseUrl}/blog/${post.slug}/`;

  return buildPageMetadata({
    title: seoTitle,
    openGraphTitle: post.title,
    twitterTitle: seoTitle,
    description,
    url: canonicalUrl,
    type: "article",
    publishedTime: post.date,
    tags: post.tags,
    image: post.heroImage || undefined,
  });
}

// ── HTML content renderer ───────────────────────────────────────────────────

function renderContent(content: string) {
  // Sanitize HTML from Ghost to prevent XSS, then render
  const clean = DOMPurify.sanitize(content, {
    ADD_TAGS: ["figure", "figcaption", "iframe"],
    ADD_ATTR: ["loading", "fetchpriority", "target", "rel"],
  });
  return parse(clean);
}

// ── Related calculator fallback ─────────────────────────────────────────────
// Если редактор не задал #calc:slug:category в Ghost, пытаемся сматчить
// калькулятор по тегам/title. Это безопасный fallback: ссылка появляется
// только если найден реально существующий slug в реестре.

const TAG_TO_CALCULATOR_SLUG: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /грунтовк/i, slug: "gruntovka" },
  { pattern: /шпакл[её]вк/i, slug: "shpaklevka" },
  { pattern: /штукатурк|ротбанд/i, slug: "shtukaturka" },
  { pattern: /краск|покраск/i, slug: "kraska" },
  { pattern: /обои|раппорт/i, slug: "oboi" },
  { pattern: /плиточн.* кле[йя]/i, slug: "klej-dlya-plitki" },
  { pattern: /затирк/i, slug: "zatirka" },
  { pattern: /плитк|кафель/i, slug: "plitka" },
  { pattern: /ламинат/i, slug: "laminat" },
  { pattern: /паркет/i, slug: "parket" },
  { pattern: /линолеум/i, slug: "linoleum" },
  { pattern: /стяжк/i, slug: "styazhka" },
  { pattern: /наливн.* пол/i, slug: "nalivnoy-pol" },
  { pattern: /водян.* т[её]пл.* пол/i, slug: "vodyanoy-teplyy-pol" },
  { pattern: /т[её]пл.* пол/i, slug: "teplyy-pol" },
  { pattern: /гипсокартон|гкл/i, slug: "gipsokarton" },
  { pattern: /кр[её]пеж|саморез|дюбел/i, slug: "krepezh" },
  { pattern: /кладк/i, slug: "kladka-kirpicha" },
  { pattern: /кирпич/i, slug: "kirpich" },
  { pattern: /газобетон|газоблок/i, slug: "gazobeton" },
  { pattern: /пеноблок|керамзитоблок/i, slug: "penobloki" },
  { pattern: /профнастил|профлист/i, slug: "krovlya" },
  { pattern: /металлочерепиц/i, slug: "krovlya" },
  { pattern: /м[яa]гк.* кровл/i, slug: "myagkaya-krovlya" },
  { pattern: /кровл|крыш/i, slug: "krovlya" },
  { pattern: /водосток/i, slug: "vodostok" },
  { pattern: /сайдинг/i, slug: "sayding" },
  { pattern: /фасад.* панел/i, slug: "fasadnye-paneli" },
  { pattern: /утеплен.* фасад/i, slug: "uteplenie-fasada-minvatoj" },
  { pattern: /утеплен.* потолк|утеплен.* кровл/i, slug: "uteplenie-potolka" },
  { pattern: /утеплен/i, slug: "uteplenie" },
  { pattern: /гидроизоляц|вологозащит/i, slug: "gidroizolyaciya-vlagozaschita" },
  { pattern: /отопл|радиатор/i, slug: "otoplenie-radiatory" },
  { pattern: /вентиляц/i, slug: "ventilyaciya" },
  { pattern: /электр|кабель|узо|автомат/i, slug: "elektrika" },
  { pattern: /забор/i, slug: "zabor" },
  { pattern: /бетон/i, slug: "beton" },
  { pattern: /арматур/i, slug: "armatura" },
  { pattern: /ленточн.* фундамент/i, slug: "lentochnyy-fundament" },
  { pattern: /плитн.* фундамент/i, slug: "plitnyj-fundament" },
  { pattern: /фундамент/i, slug: "lentochnyy-fundament" },
  { pattern: /отмостк/i, slug: "otmostka" },
  { pattern: /тротуарн.* плитк/i, slug: "trotuarnaya-plitka" },
  { pattern: /ванн/i, slug: "vannaya-komnata" },
];

function pickRelatedCalculator(post: { title: string; tags: string[] }):
  | { slug: string; categorySlug: string }
  | undefined {
  const haystack = [post.title, ...post.tags].join(" ").toLowerCase();
  for (const { pattern, slug } of TAG_TO_CALCULATOR_SLUG) {
    if (!pattern.test(haystack)) continue;
    const calc = ALL_CALCULATORS_META.find((c) => c.slug === slug);
    if (calc) return { slug: calc.slug, categorySlug: calc.categorySlug };
  }
  return undefined;
}

// ── Related posts ───────────────────────────────────────────────────────────

async function getRelatedPosts(post: { slug: string; category: string; tags: string[] }) {
  const allPosts = await getAllPosts();
  const candidates = allPosts
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      const categoryMatch = p.category === post.category ? 2 : 0;
      const tagOverlap = p.tags.filter((t) => post.tags.includes(t)).length;
      return { post: p, score: categoryMatch + tagOverlap };
    })
    .sort((a, b) => b.score - a.score);

  const related = candidates.slice(0, 3).map((c) => c.post);

  if (related.length < 3) {
    const remaining = allPosts
      .filter((p) => p.slug !== post.slug && !related.some((r) => r.slug === p.slug))
      .slice(0, 3 - related.length);
    related.push(...remaining);
  }

  return related;
}

// ── Page component ──────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const baseUrl = SITE_URL;
  // Если редактор задал #calc:slug:category в Ghost — используем явное значение.
  // Иначе пытаемся подобрать калькулятор по тегам. Никогда не показываем
  // неподтверждённую ссылку: pickRelatedCalculator проверяет существование slug.
  const effectiveRelatedCalculator =
    post.relatedCalculator ?? pickRelatedCalculator(post);
  const relatedCalculatorDef = effectiveRelatedCalculator
    ? getCalculatorBySlug(effectiveRelatedCalculator.slug)
    : undefined;

  const relatedPosts = await getRelatedPosts(post);

  const wordCount = post.content.split(/\s+/).length;

  // headline — Google предпочитает короткий variant (≤ 110 chars) для AMP/News.
  // Если редактор задал meta_title в Ghost — используем его.
  const schemaHeadline = post.metaTitle ?? post.title;

  // Дата обновления, видимая пользователю. Показываем только если правка
  // существенная — иначе любое касание в Ghost имитирует свежесть.
  const showUpdated = isMeaningfullyUpdated(post.date, post.updatedAt);
  const tocEntries = extractToc(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: schemaHeadline,
    description: post.description,
    url: `${baseUrl}/blog/${post.slug}/`,
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    wordCount,
    articleSection: post.category,
    author: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: `Редакция ${SITE_NAME}`,
      url: `${baseUrl}/o-proekte/`,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: SITE_NAME,
      url: baseUrl,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.slug}/`,
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["article h1", "article p:first-of-type"],
    },
    keywords: post.tags.join(", "),
    image: post.heroImage ? {
      "@type": "ImageObject",
      url: post.heroImage,
      width: 1200,
      height: 630,
    } : undefined,
    inLanguage: "ru",
  };

  // HowTo Schema — только если редактор явно разрешил через скрытый тег
  // #howto в Ghost. Auto-detect по title давал фейковый HowTo для справочных
  // статей вида «расход X на м²», что нарушает Google guidelines (HowTo
  // должен описывать реальную последовательность действий).
  const isHowToArticle = post.internalTags.includes("#howto");
  const howToLd = isHowToArticle ? (() => {
    // Extract h2 headings as steps from HTML content
    const h2Regex = /<h2[^>]*>([^<]+)<\/h2>/gi;
    const steps: { name: string; position: number }[] = [];
    let match;
    let i = 1;
    while ((match = h2Regex.exec(post.content)) !== null) {
      steps.push({ name: match[1].trim(), position: i++ });
    }
    if (steps.length < 2) return null;
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: post.title,
      description: post.description,
      image: post.heroImage || undefined,
      totalTime: `PT${post.readTime.replace(/[^0-9]/g, "") || "7"}M`,
      inLanguage: "ru",
      step: steps.map((s) => ({
        "@type": "HowToStep",
        position: s.position,
        name: s.name,
        url: `${baseUrl}/blog/${post.slug}/#${encodeURIComponent(s.name.toLowerCase().replace(/\s+/g, "-"))}`,
      })),
    };
  })() : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${baseUrl}/` },
      { "@type": "ListItem", position: 2, name: "Блог", item: `${baseUrl}/blog/` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${baseUrl}/blog/${post.slug}/` },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {howToLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
        />
      )}

      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="page-container py-6 max-w-3xl">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 no-underline">
              {UI_TEXT.breadcrumbHome}
            </Link>
            <span>/</span>
            <Link
              href="/blog/"
              className="hover:text-slate-600 dark:hover:text-slate-300 no-underline"
            >
              {UI_TEXT.breadcrumbBlog}
            </Link>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300">{post.title}</span>
          </nav>

          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-2xl">{post.icon}</span>
            <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
              {post.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-400">{post.readTime}</span>
            <span className="text-xs text-slate-400 dark:text-slate-400">
              <time dateTime={post.date}>{formatRuDate(post.date)}</time>
            </span>
            {showUpdated && post.updatedAt && (
              <span className="text-xs text-slate-400 dark:text-slate-400">
                · {UI_TEXT.updatedLabel} <time dateTime={post.updatedAt}>{formatRuDate(post.updatedAt)}</time>
              </span>
            )}
            <Link
              href="/o-proekte/"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 no-underline"
              rel="author"
            >
              · {UI_TEXT.authorPrefix} {SITE_NAME}
            </Link>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {post.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed max-w-2xl">
            {post.description}
          </p>

          {post.heroImage && (
            <div className="mt-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <Image
                src={post.heroImage}
                alt={post.heroImageAlt || post.title}
                className="w-full h-48 sm:h-64 md:h-80 object-cover"
                width={1200}
                height={630}
                loading="eager"
                fetchPriority="high"
              />
            </div>
          )}
        </div>
      </div>

      <article className="page-container py-8 max-w-3xl">
        {tocEntries.length > 0 && (
          <nav
            aria-label={UI_TEXT.tocTitle}
            className="mb-8 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {UI_TEXT.tocTitle}
            </p>
            <ol className="space-y-1.5 text-sm">
              {tocEntries.map((entry, i) => (
                <li key={entry.id} className="flex gap-2">
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums">{i + 1}.</span>
                  <a
                    href={`#${entry.id}`}
                    className="text-slate-700 dark:text-slate-200 hover:text-accent-700 dark:hover:text-accent-400 no-underline hover:underline"
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="prose-custom">{renderContent(post.content)}</div>

        <aside
          role="note"
          className="mt-8 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
        >
          {UI_TEXT.disclaimerText}
        </aside>

        {post.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-slate-400 dark:text-slate-400">{UI_TEXT.tagsLabel}</span>
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <ShareLinks url={`${SITE_URL}/blog/${post.slug}/`} title={post.title} />
            </div>
          </div>
        )}

        {effectiveRelatedCalculator && (
          <div className="mt-8 bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800/40 rounded-2xl p-6 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {UI_TEXT.articleCtaTitle}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-300 mb-4">
              {UI_TEXT.articleCtaDescription}
            </p>
            <Link
              href={`/kalkulyatory/${effectiveRelatedCalculator.categorySlug}/${effectiveRelatedCalculator.slug}/`}
              className="btn-primary no-underline"
            >
              {relatedCalculatorDef?.title ?? UI_TEXT.calculatorCtaFallback} →
            </Link>
          </div>
        )}

        {relatedPosts.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">
              {UI_TEXT.relatedPostsTitle}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <article
                  key={rp.slug}
                  className="card-hover flex flex-col overflow-hidden"
                >
                  {rp.heroImage && (
                    <Link href={`/blog/${rp.slug}/`} className="block">
                      <Image
                        src={rp.heroImage}
                        alt={rp.heroImageAlt || rp.title}
                        className="w-full h-32 object-cover"
                        width={400}
                        height={128}
                        loading="lazy"
                      />
                    </Link>
                  )}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="badge bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                        {rp.category}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-400 ml-auto">
                        {rp.readTime}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug text-sm flex-1">
                      <Link
                        href={`/blog/${rp.slug}/`}
                        className="no-underline hover:text-accent-700 transition-colors"
                      >
                        {rp.title}
                      </Link>
                    </h3>
                    <Link
                      href={`/blog/${rp.slug}/`}
                      className="text-sm font-medium text-accent-700 hover:text-accent-800 no-underline transition-colors mt-auto"
                    >
                      {UI_TEXT.relatedPostsReadMore}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href="/blog/"
            className="btn-secondary flex-1 text-center no-underline"
          >
            {UI_TEXT.allArticles}
          </Link>
          <Link href="/#calculators" className="btn-secondary flex-1 text-center no-underline">
            {UI_TEXT.allCalculators}
          </Link>
        </div>
      </article>
    </div>
  );
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: "Telegram", href: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`, bg: "hover:bg-[#229ED9]" },
    { label: "VK", href: `https://vk.com/share.php?url=${encoded}&title=${encodedTitle}`, bg: "hover:bg-[#4680C2]" },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encoded}`, bg: "hover:bg-[#25D366]" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 dark:text-slate-400">Поделиться:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-white hover:border-transparent transition-all no-underline ${l.bg}`}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
