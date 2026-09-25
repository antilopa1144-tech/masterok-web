// Read-only, reproducible arithmetic for the dated research snapshot.
// Run: node docs/seo/recalculate-growth-forecast-q4-2026.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('./growth-forecast-q4-2026-09-25.data.json', import.meta.url), 'utf8'));
const { metrika, wordstat, seasonalSensitivity, forecast } = data;
const sum = (values) => values.reduce((total, value) => total + value, 0);
assert.equal(sum(Object.values(metrika.sources)), metrika.visits);
assert.equal(sum(Object.values(metrika.searchEngines)), metrika.sources.search);
assert.equal(sum(Object.values(metrika.landingReport.sectionVisits)), metrika.visits);
assert.equal(metrika.landingReport.sumVisits, metrika.visits);
for (const counts of Object.values(wordstat.counts)) {
  assert.equal(counts.length, 24);
  assert(counts.every((value) => Number.isSafeInteger(value) && value >= 0));
}

const seasonalChanges = Object.entries(wordstat.counts).map(([query, values]) => ({
  query,
  august2025: values[11],
  december2025: values[15],
  decemberVsAugustPct: +(100 * (values[15] / values[11] - 1)).toFixed(1),
  decemberVsSeptember2024PerDayPct: +(100 * ((values[3] / 31) / (values[0] / 30) - 1)).toFixed(1),
  decemberVsSeptember2025PerDayPct: +(100 * ((values[15] / 31) / (values[12] / 30) - 1)).toFixed(1),
}));
const mappedVisits = sum(seasonalSensitivity.mappedLandings.map((item) => item.visits));
const seasonalIllustrations = [2024, 2025].map((year) => {
  const septemberIndex = year === 2024 ? 0 : 12;
  const adjustedMapped = sum(seasonalSensitivity.mappedLandings.map(({ query, visits }) => {
    const counts = wordstat.counts[query];
    return visits * (counts[septemberIndex + 3] / 31) / (counts[septemberIndex] / 30);
  }));
  return {
    year,
    mappedFraction: mappedVisits / metrika.visits,
    mappedFactor: adjustedMapped / mappedVisits,
    wholeSiteFactorIfRemainderFlat: (adjustedMapped + metrika.visits - mappedVisits) / metrika.visits,
  };
});

const decemberRunRate = metrika.visitors / metrika.days * forecast.days;
const scenarios = forecast.scenarios.map(({ name, season, capture }) => ({
  name,
  low: Math.round(decemberRunRate * season[0] * capture[0]),
  high: Math.round(decemberRunRate * season[1] * capture[1]),
}));
const targets = [20000, 30000].map((target) => ({
  target,
  requiredCaptureAtSeason085: target / (decemberRunRate * 0.85),
  requiredCaptureAtSeason1: target / decemberRunRate,
}));

console.log(JSON.stringify({
  validated: 'Source, engine and landing-section visit sums reconcile; 11 Wordstat series have 24 monthly values.',
  searchVisitSharePct: 100 * metrika.sources.search / metrika.visits,
  twoLargestLandingSharePct: 100 * (1938 + 1038) / metrika.visits,
  seasonalChanges,
  seasonalIllustrations,
  decemberRunRate,
  scenarios,
  planningPoint: Math.round(decemberRunRate * forecast.planningPoint.season * forecast.planningPoint.capture),
  targets,
  forecastCaveat: forecast.caveat,
}, null, 2));
