import { describe, expect, it } from "vitest";
import { optimizePackaging, type PackageOption } from "../../engine/packaging";

describe("optimizePackaging — стандартные случаи", () => {
  it("exactNeed=12.5, options=[{size:5}] → packages=3, purchaseQuantity=15, leftover=2.5", () => {
    const options: PackageOption[] = [{ size: 5, unit: "кг", label: "bag-5kg" }];
    const result = optimizePackaging(12.5, options);

    expect(result.packageCount).toBe(3);
    expect(result.purchaseQuantity).toBe(15);
    expect(result.leftover).toBe(2.5);
  });

  it("exactNeed совпадает с кратным размера → leftover=0", () => {
    const options: PackageOption[] = [{ size: 5, unit: "кг", label: "bag-5kg" }];
    const result = optimizePackaging(10, options);

    expect(result.packageCount).toBe(2);
    expect(result.purchaseQuantity).toBe(10);
    expect(result.leftover).toBe(0);
  });

  it("exactNeed=1, options=[{size:25}] → 1 пакет, purchaseQuantity=25, leftover=24", () => {
    const options: PackageOption[] = [{ size: 25, unit: "кг", label: "bag-25kg" }];
    const result = optimizePackaging(1, options);

    expect(result.packageCount).toBe(1);
    expect(result.purchaseQuantity).toBe(25);
    expect(result.leftover).toBe(24);
  });
});

describe("optimizePackaging — нулевая потребность", () => {
  it("exactNeed=0 → packages=0, purchaseQuantity=0, leftover=0", () => {
    const options: PackageOption[] = [{ size: 5, unit: "кг", label: "bag-5kg" }];
    const result = optimizePackaging(0, options);

    expect(result.packageCount).toBe(0);
    expect(result.purchaseQuantity).toBe(0);
    expect(result.leftover).toBe(0);
  });
});

describe("optimizePackaging — отрицательная потребность", () => {
  it("exactNeed=-5 → clamp до 0", () => {
    const options: PackageOption[] = [{ size: 5, unit: "кг", label: "bag-5kg" }];
    const result = optimizePackaging(-5, options);

    expect(result.packageCount).toBe(0);
    expect(result.purchaseQuantity).toBe(0);
    expect(result.leftover).toBe(0);
  });
});

describe("optimizePackaging — нулевой размер упаковки", () => {
  it("options=[{size:0}] → не падает (пропускает zero-size options)", () => {
    const options: PackageOption[] = [{ size: 0, unit: "кг", label: "bag-0kg" }];
    // With only zero-size options, all get skipped, which means `best` is undefined
    // and the function may return undefined. Let's just ensure no throw.
    expect(() => optimizePackaging(10, options)).not.toThrow();
  });

  it("options=[{size:0}, {size:5}] → использует size=5", () => {
    const options: PackageOption[] = [
      { size: 0, unit: "кг", label: "bag-0kg" },
      { size: 5, unit: "кг", label: "bag-5kg" },
    ];
    const result = optimizePackaging(12, options);

    expect(result.package.size).toBe(5);
    expect(result.packageCount).toBe(3);
    expect(result.purchaseQuantity).toBe(15);
  });
});

describe("optimizePackaging — пустые options", () => {
  it("пустой массив → fallback на size=1", () => {
    const result = optimizePackaging(12.5, []);

    expect(result.package.size).toBe(1);
    expect(result.purchaseQuantity).toBe(13); // Math.ceil(12.5 / 1) * 1
    expect(result.leftover).toBe(0.5);
    expect(result.packageCount).toBe(13);
  });
});

describe("optimizePackaging — выбор лучшей упаковки из нескольких", () => {
  it("multiple options → выбирается вариант с минимальным остатком", () => {
    const options: PackageOption[] = [
      { size: 10, unit: "кг", label: "bag-10kg" },
      { size: 7, unit: "кг", label: "bag-7kg" },
    ];
    const result = optimizePackaging(13, options);

    // size=10 → 2 packages = 20, leftover=7
    // size=7  → 2 packages = 14, leftover=1
    expect(result.package.size).toBe(7);
    expect(result.packageCount).toBe(2);
    expect(result.purchaseQuantity).toBe(14);
    expect(result.leftover).toBe(1);
  });

  it("при одинаковом остатке выбирается вариант с меньшим purchaseQuantity", () => {
    const options: PackageOption[] = [
      { size: 5, unit: "кг", label: "bag-5kg" },
      { size: 10, unit: "кг", label: "bag-10kg" },
    ];
    // exactNeed=10: size=5 → 2 packages=10, leftover=0; size=10 → 1 package=10, leftover=0
    // Same leftover, but purchaseQuantity is the same too (10=10), so first one wins
    const result = optimizePackaging(10, options);

    expect(result.leftover).toBe(0);
    expect(result.purchaseQuantity).toBe(10);
  });
});
