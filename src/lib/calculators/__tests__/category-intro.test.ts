import { describe, expect, it } from "vitest";
import { TOOL_CONFIGS, toolHref } from "../../tools/config";
import { ALL_CALCULATORS_META } from "../meta.generated";
import { CATEGORY_INTRO } from "../category-intro";

describe("Быстрые ссылки категорий", () => {
  it("ведут только на существующие калькуляторы и инструменты", () => {
    const knownProductUrls = new Set([
      ...ALL_CALCULATORS_META.map(
        (calculator) =>
          `/kalkulyatory/${calculator.categorySlug}/${calculator.slug}/`,
      ),
      ...TOOL_CONFIGS.map((tool) => toolHref(tool.slug)),
    ]);

    for (const [categoryId, intro] of Object.entries(CATEGORY_INTRO)) {
      for (const link of intro.quickLinks ?? []) {
        expect(link.label.trim(), `пустой текст ссылки у ${categoryId}`).not.toBe("");
        expect(
          knownProductUrls.has(link.href),
          `быстрая ссылка ${link.href} у ${categoryId} не ведёт на страницу продукта`,
        ).toBe(true);
      }
    }
  });

  it("выводит плитный фундамент в быстрый выбор и не ограничивает проектную проверку многоэтажными домами", () => {
    const foundation = CATEGORY_INTRO.foundation;

    expect(foundation.quickLinks).toContainEqual({
      label: "Рассчитать материалы плитного фундамента",
      href: "/kalkulyatory/fundament/plitnyj-fundament/",
    });
    expect(foundation.lead).toContain("определяют по проекту");
    expect(foundation.pitfalls?.join(" ")).toContain("для каждого здания");
    expect(foundation.pitfalls?.join(" ")).not.toMatch(/многоэтаж/i);
  });

  it("связывает потолочные системы со схемой светильников и сезонным утеплением", () => {
    const ceiling = CATEGORY_INTRO.ceiling;
    const hrefs = ceiling.quickLinks?.map((link) => link.href) ?? [];

    expect(hrefs).toContain("/kalkulyatory/potolki/reechnyj-potolok/");
    expect(hrefs).toContain("/kalkulyatory/potolki/uteplenie-potolka/");
    expect(hrefs).toContain("/instrumenty/rasstanovka-svetilnikov/");
    expect(ceiling.lead).toContain("квартиры или дома");
    expect(ceiling.pitfalls?.join(" ")).toContain("до заказа материалов");
  });

  it("связывает пирог пола с электрическим и водяным подогревом", () => {
    const flooring = CATEGORY_INTRO.flooring;
    const hrefs = flooring.quickLinks?.map((link) => link.href) ?? [];

    expect(hrefs).toContain("/kalkulyatory/poly/styazhka/");
    expect(hrefs).toContain("/kalkulyatory/poly/nalivnoy-pol/");
    expect(hrefs).toContain("/kalkulyatory/inzhenernye/teplyy-pol/");
    expect(hrefs).toContain("/kalkulyatory/inzhenernye/vodyanoy-teplyy-pol/");
    expect(flooring.lead).toContain("квартире или доме");
    expect(flooring.lead).toContain("одна площадь помещения их не определяет");
    expect(flooring.pitfalls?.join(" ")).not.toMatch(/учитываем автоматически/i);
  });

  it("не обещает нормативный запас инженерных материалов и ведёт к стяжке", () => {
    const engineering = CATEGORY_INTRO.engineering;
    const hrefs = engineering.quickLinks?.map((link) => link.href) ?? [];

    expect(hrefs).toContain("/kalkulyatory/inzhenernye/teplyy-pol/");
    expect(hrefs).toContain("/kalkulyatory/inzhenernye/vodyanoy-teplyy-pol/");
    expect(hrefs).toContain("/kalkulyatory/poly/styazhka/");
    expect(engineering.lead).not.toMatch(/запас по нормативу/i);
    expect(engineering.pitfalls?.join(" ")).toContain("не доказывает");
  });

  it("связывает подготовку стен квартиры с грунтовкой, шпаклёвкой и финишем", () => {
    const interior = CATEGORY_INTRO.interior;
    const hrefs = interior.quickLinks?.map((link) => link.href) ?? [];

    expect(hrefs).toContain("/kalkulyatory/otdelka/gruntovka/");
    expect(hrefs).toContain("/kalkulyatory/otdelka/shpaklevka/");
    expect(hrefs).toContain("/kalkulyatory/otdelka/kraska/");
    expect(hrefs).toContain("/kalkulyatory/otdelka/oboi/");
    expect(hrefs).toContain("/instrumenty/raskladka-oboev/");
    expect(interior.lead).toContain("квартире или доме");
    expect(interior.lead).toMatch(/тех(?:ническ\S* карт|карт)/i);
    expect(interior.pitfalls?.join(" ")).toMatch(/отопительн\S* сезон/i);
  });
});
