import { describe, it, expect } from "vitest";
import { CATEGORIES, getCategoryBySlug, getCategoryById } from "../categories";

describe("Категории калькуляторов", () => {
  describe("CATEGORIES массив", () => {
    it("содержит 8 категорий", () => {
      expect(CATEGORIES).toHaveLength(8);
    });

    it("все id уникальны", () => {
      const ids = CATEGORIES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("все slug уникальны", () => {
      const slugs = CATEGORIES.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });

    it("все категории имеют обязательные поля", () => {
      for (const cat of CATEGORIES) {
        expect(cat.id, `id пуст у категории`).toBeTruthy();
        expect(cat.label, `label пуст у ${cat.id}`).toBeTruthy();
        expect(cat.slug, `slug пуст у ${cat.id}`).toBeTruthy();
        expect(cat.color, `color пуст у ${cat.id}`).toBeTruthy();
        expect(cat.bgColor, `bgColor пуст у ${cat.id}`).toBeTruthy();
        expect(cat.icon, `icon пуст у ${cat.id}`).toBeTruthy();
        expect(cat.description, `description пуст у ${cat.id}`).toBeTruthy();
      }
    });

    it("цвета — валидные hex", () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const cat of CATEGORIES) {
        expect(cat.color, `color невалидный у ${cat.id}`).toMatch(hexRegex);
        expect(cat.bgColor, `bgColor невалидный у ${cat.id}`).toMatch(hexRegex);
      }
    });

    it("содержит все ожидаемые id", () => {
      const ids = CATEGORIES.map((c) => c.id);
      const expected = [
        "foundation", "walls", "flooring", "roofing",
        "facade", "engineering", "interior", "ceiling",
      ];
      for (const id of expected) {
        expect(ids, `отсутствует категория ${id}`).toContain(id);
      }
    });
  });

  describe("getCategoryBySlug", () => {
    it("находит категорию по slug", () => {
      expect(getCategoryBySlug("fundament")?.id).toBe("foundation");
      expect(getCategoryBySlug("steny")?.id).toBe("walls");
      expect(getCategoryBySlug("poly")?.id).toBe("flooring");
      expect(getCategoryBySlug("krovlya")?.id).toBe("roofing");
      expect(getCategoryBySlug("fasad")?.id).toBe("facade");
      expect(getCategoryBySlug("inzhenernye")?.id).toBe("engineering");
      expect(getCategoryBySlug("otdelka")?.id).toBe("interior");
      expect(getCategoryBySlug("potolki")?.id).toBe("ceiling");
    });

    it("возвращает undefined для несуществующего slug", () => {
      expect(getCategoryBySlug("nonexistent")).toBeUndefined();
      expect(getCategoryBySlug("")).toBeUndefined();
    });
  });

  describe("getCategoryById", () => {
    it("находит категорию по id", () => {
      expect(getCategoryById("foundation")?.slug).toBe("fundament");
      expect(getCategoryById("walls")?.slug).toBe("steny");
      expect(getCategoryById("flooring")?.slug).toBe("poly");
      expect(getCategoryById("ceiling")?.slug).toBe("potolki");
    });

    it("возвращает undefined для несуществующего id", () => {
      expect(getCategoryById("nonexistent")).toBeUndefined();
      expect(getCategoryById("")).toBeUndefined();
    });
  });
});
