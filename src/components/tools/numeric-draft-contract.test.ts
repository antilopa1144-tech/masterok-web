import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SEARCH_ROOTS = [
  path.join(ROOT, "src", "app", "instrumenty"),
  path.join(ROOT, "src", "components", "projects"),
];

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTsxFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [fullPath] : [];
  });
}

describe("numeric draft contract", () => {
  it("не схлопывает пустой черновик пользовательского поля в 0 на каждом onChange", () => {
    const violations = SEARCH_ROOTS
      .flatMap(listTsxFiles)
      .filter((filePath) =>
        /Number\([^)]*\.target\.value\)\s*\|\|\s*0/.test(readFileSync(filePath, "utf8")),
      )
      .map((filePath) => path.relative(ROOT, filePath));

    expect(violations).toEqual([]);
  });
});
