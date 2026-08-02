import { ALL_CALCULATORS_META } from "@/lib/calculators/meta.generated";

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
  // «Профнастил на забор» должен вести в расчёт ограждения, а не кровли.
  // Более узкий контекст ставим перед общим названием материала.
  { pattern: /забор/i, slug: "zabor" },
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
  { pattern: /бетон/i, slug: "beton" },
  { pattern: /арматур/i, slug: "armatura" },
  { pattern: /ленточн.* фундамент/i, slug: "lentochnyy-fundament" },
  { pattern: /плитн.* фундамент/i, slug: "plitnyj-fundament" },
  { pattern: /фундамент/i, slug: "lentochnyy-fundament" },
  { pattern: /отмостк/i, slug: "otmostka" },
  { pattern: /тротуарн.* плитк/i, slug: "trotuarnaya-plitka" },
  { pattern: /ванн/i, slug: "vannaya-komnata" },
];

export function pickRelatedCalculator(post: { title: string; tags: string[] }):
  | { slug: string; categorySlug: string }
  | undefined {
  const haystack = [post.title, ...post.tags].join(" ").toLowerCase();
  for (const { pattern, slug } of TAG_TO_CALCULATOR_SLUG) {
    if (!pattern.test(haystack)) continue;
    const calculator = ALL_CALCULATORS_META.find((item) => item.slug === slug);
    if (calculator) {
      return { slug: calculator.slug, categorySlug: calculator.categorySlug };
    }
  }
  return undefined;
}
