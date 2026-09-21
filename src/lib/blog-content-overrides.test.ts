import { describe, expect, it } from "vitest";
import type { BlogPost } from "./blog";
import { applyBlogContentOverrides } from "./blog-content-overrides";
import { foundationSlabDef } from "./calculators/formulas/foundation-slab";
import { pavingTilesDef } from "./calculators/formulas/paving-tiles";
import { roofingDef } from "./calculators/formulas/roofing";
import { stripFoundationDef } from "./calculators/formulas/strip-foundation";
import { calculatePaverLayout } from "./tools/paver-layout";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: "skolko-proflista-na-zabor",
    title: "Сколько профлиста нужно на забор: расчёт по длине",
    description: "Старое описание",
    date: "2026-03-01",
    readTime: "7 мин",
    category: "Фасад",
    icon: "🔩",
    tags: ["забор", "профнастил"],
    internalTags: [],
    heroImage: "",
    heroImageAlt: "",
    content:
      '<p><a href="https://getmasterok.ru/kalkulyatory/krovlya/krovlya/">профнастила</a></p><h2 id="formula">Формула</h2>',
    ...overrides,
  };
}

describe("applyBlogContentOverrides", () => {
  it("исправляет сниппет, перелинковку и добавляет таблицу быстрых ответов", () => {
    const result = applyBlogContentOverrides(makePost());

    expect(result.title).toContain("20, 30 и 50 м");
    expect(result.metaTitle).toContain("20, 30 и 50 м");
    expect(result.description).toContain("таблица для С8 и С21");
    expect(result.content).toContain('id="skolko-listov-20-30-50"');
    expect(result.content).toContain('href="/kalkulyatory/fasad/zabor/"');
    expect(result.content).not.toContain("/kalkulyatory/krovlya/krovlya/");
  });

  it("не дублирует таблицу при повторном применении", () => {
    const once = applyBlogContentOverrides(makePost());
    const twice = applyBlogContentOverrides(once);

    expect(twice.content.match(/id="skolko-listov-20-30-50"/g)).toHaveLength(1);
  });

  it("ставит дату локального исправления, когда Ghost обновлял статью раньше", () => {
    const result = applyBlogContentOverrides(makePost({
      updatedAt: "2026-08-01",
      updatedAtIso: "2026-08-01T18:30:00.000Z",
    }));

    expect(result.updatedAt).toBe("2026-08-02");
    expect(result.updatedAtIso).toBe("2026-08-02T00:00:00.000Z");
  });

  it("не откатывает более позднее обновление Ghost в тот же день", () => {
    const result = applyBlogContentOverrides(makePost({
      updatedAt: "2026-08-02",
      updatedAtIso: "2026-08-02T15:45:00.000Z",
    }));

    expect(result.updatedAt).toBe("2026-08-02");
    expect(result.updatedAtIso).toBe("2026-08-02T15:45:00.000Z");
    expect(applyBlogContentOverrides(result)).toEqual(result);
  });

  it("исправляет статью о стяжке тёплого пола и ведёт в калькулятор стяжки", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "tolshchina-styazhki-pod-teplyy-pol",
      title: "Толщина стяжки под тёплый пол: золотая середина",
      content: "<p>СП 29.13330.2023 требует одно, а минимальный слой 35 мм — другое.</p>",
      relatedCalculator: { slug: "teplyy-pol", categorySlug: "poly" },
    }));

    expect(result.title).toBe(
      "Толщина стяжки для тёплого пола: слой над трубой и общая высота",
    );
    expect(result.metaTitle).toContain("над трубой и общая");
    expect(result.description).toContain("требования СП");
    expect(result.relatedCalculator).toEqual({ slug: "styazhka", categorySlug: "poly" });
    expect(result.content).toContain("не менее 61 мм");
    expect(result.content).toContain('href="/kalkulyatory/poly/styazhka/"');
    expect(result.content).toContain(
      'href="/kalkulyatory/inzhenernye/vodyanoy-teplyy-pol/"',
    );
    expect(result.content).not.toContain("СП 29.13330.2023");
    expect(result.content).not.toContain("минимальный слой 35 мм");
  });

  it("идемпотентно применяет полную замену статьи о стяжке тёплого пола", () => {
    const post = makePost({ slug: "tolshchina-styazhki-pod-teplyy-pol" });
    const once = applyBlogContentOverrides(post);
    const twice = applyBlogContentOverrides(once);

    expect(twice).toEqual(once);
  });

  it("заменяет статью о расчёте ГКЛ на проверяемую методику для стены", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "rasschitat-gipsokarton-na-stenu",
      title: "Как рассчитать гипсокартон",
      content: "<p>Лист 3000 × 1200 мм имеет площадь 3,5 м².</p>",
    }));

    expect(result.title).toContain("Расчёт гипсокартона на стену");
    expect(result.metaTitle).toContain("листы и профиль");
    expect(result.description).toContain("пример стены 4 × 2,7 м");
    expect(result.updatedAt).toBe("2026-09-21");
    expect(result.relatedCalculator).toEqual({ slug: "gipsokarton", categorySlug: "steny" });
    expect(result.content).toContain("1,2 × 3,0");
    expect(result.content).toContain("3,6 м²");
    expect(result.content).toContain("минимум 4 целых листа");
    expect(result.content).toContain("Реальном");
    expect(result.content).toContain("КНАУФ С 623");
    expect(result.content).toContain("/instrumenty/raskladka-listov/?");
    expect(result.content).toContain("surfaceWidthMm=4000");
    expect(result.content).toContain("surfaceHeightMm=2700");
    expect(result.content).toContain("/kalkulyatory/potolki/podvesnoy-potolok-gkl/");
    expect(result.content).toContain("Стена, потолок и раскладка — разные задачи");
    expect(result.content).not.toContain("3,5 м²");
  });

  it("идемпотентно применяет полную замену статьи о расчёте ГКЛ", () => {
    const post = makePost({ slug: "rasschitat-gipsokarton-na-stenu" });
    const once = applyBlogContentOverrides(post);
    const twice = applyBlogContentOverrides(once);

    expect(twice).toEqual(once);
  });

  it("заменяет статью о доме 10×10 на расчёт с явными допущениями", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "skolko-kirpicha-na-dom-10x10",
      title: "Точный расчёт 2026 года",
      content: "<p>Ошибки проектирования сведены к минимуму.</p>",
    }));

    expect(result.title).toContain("Сколько кирпича нужно на дом 10×10");
    expect(result.description).toContain("одноэтажный дом 10 × 10 м");
    expect(result.relatedCalculator).toEqual({ slug: "kirpich", categorySlug: "steny" });
    expect(result.content).toContain("чистая площадь кладки составит 105 м²");
    expect(result.content).toContain("16 065");
    expect(result.content).toContain("16 869");
    expect(result.content).toContain("не определяет несущую способность");
    expect(result.content).not.toContain("Ошибки проектирования сведены к минимуму");
  });

  it("идемпотентно применяет замену статьи о доме 10×10", () => {
    const post = makePost({ slug: "skolko-kirpicha-na-dom-10x10" });
    const once = applyBlogContentOverrides(post);
    expect(applyBlogContentOverrides(once)).toEqual(once);
  });

  it("заменяет статью о фундаменте на ведомость материалов по проектным размерам", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "raschet-fundamenta",
      title: "Как самостоятельно выбрать фундамент",
      content: "<p>Для дома достаточно плиты 200 мм и бетона B20.</p>",
    }));

    expect(result.title).toContain("материалы для фундамента");
    expect(result.metaTitle).toContain("бетон, арматура и опалубка");
    expect(result.description).toContain("по размерам из проекта");
    expect(result.updatedAt).toBe("2026-09-21");
    expect(result.relatedCalculator).toEqual({ slug: "lentochnyy-fundament", categorySlug: "fundament" });
    expect(result.content).toContain("40 × 0,4 × 1,0 = <strong>16 м³</strong>");
    expect(result.content).toContain("16,8 м³");
    expect(result.content).toContain("10 × 6 × 0,2 = <strong>12 м³</strong>");
    expect(result.content).toContain("12,6 м³");
    expect(result.content).toContain("/kalkulyatory/fundament/lentochnyy-fundament/?");
    expect(result.content).toContain("/kalkulyatory/fundament/plitnyj-fundament/?");
    expect(result.content).toContain("/kalkulyatory/fundament/beton/");
    expect(result.content).toContain("/kalkulyatory/fundament/armatura/");
    expect(result.content).not.toContain("достаточно плиты 200 мм");
    expect(result.content).not.toContain("бетона B20");

    const strip = stripFoundationDef.calculate({
      perimeter: 40,
      width: 400,
      depth: 700,
      aboveGround: 300,
      reserve: 5,
      readyMixOrderStepM3: 0.1,
      deliveryAllowanceM3: 0,
      accuracyMode: "basic" as unknown as number,
    });
    expect(strip.totals.vol).toBe(16);
    expect(strip.scenarios?.REC.exact_need).toBe(16.8);

    const slab = foundationSlabDef.calculate({
      length: 10,
      width: 6,
      thickness: 200,
      concreteReservePercent: 5,
      readyMixOrderStepM3: 0.1,
      deliveryAllowanceM3: 0,
      accuracyMode: "basic" as unknown as number,
    });
    expect(slab.totals.concreteM3).toBe(12);
    expect(slab.scenarios?.REC.exact_need).toBe(12.6);
  });

  it("идемпотентно применяет замену статьи о фундаменте", () => {
    const post = makePost({ slug: "raschet-fundamenta" });
    const once = applyBlogContentOverrides(post);
    expect(applyBlogContentOverrides(once)).toEqual(once);
  });

  it("заменяет статью о кровле на проверяемый расчёт площади и закупки", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "kak-rasschitat-krovlyu",
      title: "Точный расчёт кровли в 2026 году",
      content:
        "<p>В 2026 году нагрузки пересмотрены, а подрядчики всегда добавляют 8–15 процентов.</p>",
    }));

    expect(result.title).toContain("Как рассчитать материалы кровли");
    expect(result.metaTitle).toContain("площадь и закупка");
    expect(result.description).toContain("площадь скатов");
    expect(result.updatedAt).toBe("2026-09-21");
    expect(result.relatedCalculator).toEqual({ slug: "krovlya", categorySlug: "krovlya" });
    expect(result.content).toContain("126,5 м²");
    expect(result.content).toContain("135,355 м²");
    expect(result.content).toContain("65 целых листов");
    expect(result.content).toContain("S<sub>скатов</sub> = S<sub>проекции</sub> / cos");
    expect(result.content).toContain("/kalkulyatory/krovlya/krovlya/?");
    expect(result.content).toContain("/kalkulyatory/krovlya/myagkaya-krovlya/");
    expect(result.content).toContain("/kalkulyatory/krovlya/vodostok/");
    expect(result.content).toContain("СП 17.13330.2017");
    expect(result.content).toContain("СП 20.13330.2016");
    expect(result.content).not.toContain("нагрузки пересмотрены");
    expect(result.content).not.toContain("8–15 процентов");

    const example = roofingDef.calculate({
      roofAreaMode: 0,
      projectSlopeAreaM2: 126.5,
      roofingType: 0,
      primaryCoverageM2: 2.1,
      primaryReservePercent: 7,
      accuracyMode: "basic" as unknown as number,
    });
    expect(example.totals.selectedSlopeAreaM2).toBe(126.5);
    expect(example.totals.primaryUnits).toBe(65);
    expect(example.materials[0]?.withReserve).toBe(135.355);
  });

  it("идемпотентно применяет замену статьи о кровле", () => {
    const post = makePost({ slug: "kak-rasschitat-krovlyu" });
    const once = applyBlogContentOverrides(post);
    expect(applyBlogContentOverrides(once)).toEqual(once);
  });

  it("заменяет статью о тротуарной плитке на маршрут от раскладки к закупке", () => {
    const result = applyBlogContentOverrides(makePost({
      slug: "trotuarnaia-plitka-v-2026-ghodu-kak-vybrat-ulozhit-i-sokhranit-dvor-v-rossiiskikh-riealiiakh",
      title: "Тротуарная плитка в 2026 году",
      content:
        "<p>Геотекстиль обязателен. Для пешеходов снимите 20 см, запас всегда 5–7%, а покрытие прослужит десятилетия без ремонта.</p>",
    }));

    expect(result.title).toContain("Расчёт тротуарной плитки");
    expect(result.metaTitle).toContain("раскладка и закупка");
    expect(result.description).toContain("раскладки");
    expect(result.updatedAt).toBe("2026-09-21");
    expect(result.relatedCalculator).toEqual({ slug: "trotuarnaya-plitka", categorySlug: "fasad" });
    expect(result.content).toContain("3 × 5 м");
    expect(result.content).toContain("803 элемента");
    expect(result.content).toContain("16,1 м²");
    expect(result.content).toContain("16 бордюров");
    expect(result.content).toContain("/instrumenty/raskladka-trotuarnoy-plitki/");
    expect(result.content).toContain("/kalkulyatory/fasad/trotuarnaya-plitka/?");
    expect(result.content).toContain("ГОСТ 17608-2017");
    expect(result.content).toContain("СП 82.13330.2016");
    expect(result.content).toContain("ГОСТ 6665-91");
    expect(result.content).not.toContain("Геотекстиль обязателен");
    expect(result.content).not.toContain("снимите 20 см");
    expect(result.content).not.toContain("запас всегда 5–7%");
    expect(result.content).not.toContain("десятилетия без ремонта");

    const layout = calculatePaverLayout({
      surfaceWidthMm: 3000,
      surfaceLengthMm: 5000,
      paverWidthMm: 100,
      paverLengthMm: 200,
      jointMm: 3,
      pattern: "offset-half",
      reservePercent: 7,
    });
    expect(layout.areaM2).toBe(15);
    expect(layout.basePavers).toBe(750);
    expect(layout.reservePavers).toBe(53);
    expect(layout.purchasePavers).toBe(803);

    const purchase = pavingTilesDef.calculate({
      area: 15,
      tileReservePercent: 7,
      tileSaleStepM2: 0.1,
      borderEnabled: 1,
      perimeter: 16,
      borderPieceLengthM: 1,
      borderReservePercent: 0,
      layersEnabled: 0,
      jointSandEnabled: 0,
      geotextileEnabled: 0,
      accuracyMode: "basic" as unknown as number,
    });
    expect(purchase.totals.tileReservedM2).toBe(16.05);
    expect(purchase.totals.tilePurchaseM2).toBe(16.1);
    expect(purchase.totals.borderPurchasePcs).toBe(16);
  });

  it("идемпотентно применяет замену статьи о тротуарной плитке", () => {
    const post = makePost({
      slug: "trotuarnaia-plitka-v-2026-ghodu-kak-vybrat-ulozhit-i-sokhranit-dvor-v-rossiiskikh-riealiiakh",
    });
    const once = applyBlogContentOverrides(post);
    expect(applyBlogContentOverrides(once)).toEqual(once);
  });

  it("не меняет остальные статьи", () => {
    const post = makePost({ slug: "drugaya-statya" });
    expect(applyBlogContentOverrides(post)).toBe(post);
  });
});
