import Image from "next/image";
import Link from "next/link";
import { getCalculatorMetaBySlug } from "@/lib/calculators/meta.generated";
import { CATEGORIES } from "@/lib/calculators/categories";
import CategoryIcon from "@/components/ui/CategoryIcon";
import FeedbackFooterLink from "@/components/feedback/FeedbackFooterLink";
import { SITE_FOOTER_DESCRIPTION, SITE_NAME } from "@/lib/site";

const UI_TEXT = {
  siteDescription: SITE_FOOTER_DESCRIPTION,
  downloadApp: "Скачать приложение",
  categoriesTitle: "Категории",
  popularTitle: "Популярное",
  servicesTitle: "Сервисы",
  aiAssistant: "Михалыч — AI-ассистент",
  blog: "Блог",
  app: "Приложение",
  myRenovation: "Мой ремонт — сметы",
  reportTitle: "Нашли ошибку или есть идея?",
  reportDescription: "Напишите напрямую — читаю каждый отзыв",
  leaveFeedback: "Оставить отзыв →",
  copyrightSuffix: `${SITE_NAME}. Все расчёты носят справочный характер.`,
  standards: "Расчёты по ГОСТ и СНиП",
  popularCalculatorFallback: "Калькулятор",
} as const;

const POPULAR_CALCULATOR_SLUGS = [
  "beton",
  "kirpich",
  "krovlya",
  "plitka",
  "laminat",
  "oboi",
] as const;

const POPULAR_CALCULATOR_LINKS = POPULAR_CALCULATOR_SLUGS.map((slug) => {
  const calculator = getCalculatorMetaBySlug(slug);

  return {
    slug,
    href: calculator ? `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/` : "/kalkulyatory/",
    label: calculator?.title ?? UI_TEXT.popularCalculatorFallback,
  };
});

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-slate-100 text-slate-600 border-t border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800">
      <div className="page-container-wide py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white mb-3 no-underline hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
            >
              <Image
                src="/icon1.png"
                alt=""
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg shrink-0"
              />
              <span>{SITE_NAME}</span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {UI_TEXT.siteDescription}
            </p>
            <Link
              href="/prilozhenie/"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors no-underline mt-4"
            >
              <CategoryIcon icon="phone" size={14} color="currentColor" />
              {UI_TEXT.downloadApp}
            </Link>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              {UI_TEXT.categoriesTitle}
            </h3>
            <ul className="space-y-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/kalkulyatory/${cat.slug}/`}
                    prefetch={false}
                    className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline"
                  >
                    <CategoryIcon icon={cat.icon} size={14} color="currentColor" />
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              {UI_TEXT.popularTitle}
            </h3>
            <ul className="space-y-2">
              {POPULAR_CALCULATOR_LINKS.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              {UI_TEXT.servicesTitle}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/mikhalych/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="bot" size={14} color="currentColor" />
                  {UI_TEXT.aiAssistant}
                </Link>
              </li>
              <li>
                <Link href="/proekty/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="checklist" size={14} color="currentColor" />
                  {UI_TEXT.myRenovation}
                </Link>
              </li>
              <li>
                <Link href="/blog/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="book" size={14} color="currentColor" />
                  {UI_TEXT.blog}
                </Link>
              </li>
              <li>
                <Link href="/prilozhenie/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="phone" size={14} color="currentColor" />
                  {UI_TEXT.app}
                </Link>
              </li>
              <li>
                <Link href="/o-proekte/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  О проекте
                </Link>
              </li>
              <li>
                <Link href="/all/" className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                  <CategoryIcon icon="tile" size={14} color="currentColor" />
                  Все калькуляторы
                </Link>
              </li>
            </ul>

            <div className="mt-6 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mb-1">
                {UI_TEXT.reportTitle}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {UI_TEXT.reportDescription}
              </p>
              <FeedbackFooterLink className="mt-2 inline-block text-xs font-medium text-accent-700 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors">
                {UI_TEXT.leaveFeedback}
              </FeedbackFooterLink>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © {year} {UI_TEXT.copyrightSuffix}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/politika-konfidencialnosti/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors no-underline">
                Конфиденциальность
              </Link>
              <span className="text-sm text-slate-500 dark:text-slate-400">{UI_TEXT.standards}</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}






