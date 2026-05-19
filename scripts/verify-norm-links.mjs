import { readFileSync } from "node:fs";
import { CONSUMPTION_NORMS } from "../src/lib/tools/norms-data.ts";

const meta = readFileSync("src/lib/calculators/meta.generated.ts", "utf8");
const calcSet = new Set();
for (const block of meta.split(/\n  \{/)) {
  const slug = block.match(/"slug": "([^"]+)"/)?.[1];
  const categorySlug = block.match(/"categorySlug": "([^"]+)"/)?.[1];
  if (slug && categorySlug) calcSet.add(`${categorySlug}/${slug}`);
}

const bad = [];
for (const cat of CONSUMPTION_NORMS) {
  if (!cat.calculator) continue;
  const key = `${cat.calculator.categorySlug}/${cat.calculator.slug}`;
  if (!calcSet.has(key)) bad.push({ category: cat.title, key });
}

console.log(`checked norms with calculator refs; broken: ${bad.length}`);
bad.forEach((b) => console.log(`  ${b.material} -> ${b.key}`));
process.exit(bad.length > 0 ? 1 : 0);
