import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const generator = read("src/app/instrumenty/raskladka-plitki/TileLayoutGenerator.tsx");
const selector = read("src/app/instrumenty/raskladka-plitki/TileSurfaceSelector.tsx");
const page = read("src/app/instrumenty/raskladka-plitki/page.tsx");

// Source contracts supplement, but do not replace, desktop/mobile browser checks.
describe("tile surface entry contracts", () => {
  it("offers the surface choice before the saved-project workspace", () => {
    const entry = generator.indexOf('data-testid="tile-surface-entry"');
    expect(entry).toBeGreaterThan(-1);
    expect(entry).toBeLessThan(generator.indexOf('data-testid="tile-project-workspace"'));
  });

  it("shares the existing surface state with both controls", () => {
    expect(generator.match(/<TileSurfaceSelector value=\{surfaceView\} onChange=\{setSurfaceView\}/g)).toHaveLength(2);
    expect(selector).not.toContain("useState");
    expect(selector).toContain("onClick={() => onChange(surface)}");
  });

  it("exposes labelled groups, pressed state and non-submit buttons", () => {
    expect(selector).toContain('role="group" aria-label={label}');
    expect(selector).toContain('type="button"');
    expect(selector).toContain("aria-pressed={value === surface}");
  });

  it("describes both supported surfaces without renaming the search title", () => {
    expect(page).toContain("Выберите стену или пол");
    expect(page).toContain("Проём можно учесть для стены.");
    expect(page).toContain("Генератор раскладки плитки");
    expect(generator).not.toContain("Сохраните стену и вернитесь к ней позже");
  });
});
