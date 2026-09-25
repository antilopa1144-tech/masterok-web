// Compact a read-only Yandex.Webmaster query-analytics report from stdin.
// Example: query_analytics.py ... | node scripts/summarize-yandex-query-analytics.mjs
let input = '';
for await (const chunk of process.stdin) input += chunk;

const report = JSON.parse(input);
if (report.state === 'error') throw new Error(`Yandex query report: ${report.code ?? 'unknown error'}`);
if (!Array.isArray(report.rows) || !Number.isInteger(report.count)) {
  throw new Error('Yandex query report has an unexpected shape');
}

let firstDate = null;
let lastDate = null;
const daily = new Map();
const queries = report.rows.map((row) => {
  const query = row.text_indicator?.value;
  if (typeof query !== 'string' || !Array.isArray(row.statistics)) {
    throw new Error('Yandex query report contains an invalid row');
  }
  let impressions = 0;
  let clicks = 0;
  for (const statistic of row.statistics) {
    const { date, field, value } = statistic;
    if (typeof date === 'string') {
      if (firstDate === null || date < firstDate) firstDate = date;
      if (lastDate === null || date > lastDate) lastDate = date;
    }
    if (field !== 'IMPRESSIONS' && field !== 'CLICKS') continue;
    if (typeof date !== 'string' || !Number.isFinite(value) || value < 0) {
      throw new Error('Yandex query report contains an invalid statistic');
    }
    const day = daily.get(date) ?? { date, impressions: 0, clicks: 0 };
    if (field === 'IMPRESSIONS') {
      impressions += value;
      day.impressions += value;
    } else {
      clicks += value;
      day.clicks += value;
    }
    daily.set(date, day);
  }
  return { query, impressions, clicks };
});

const top = queries
  .filter(({ impressions, clicks }) => impressions > 0 || clicks > 0)
  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
  .slice(0, 12);

const dates = [];
if (firstDate !== null && lastDate !== null) {
  const start = Date.parse(`${firstDate}T00:00:00Z`);
  const end = Date.parse(`${lastDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start > 366 * 86_400_000) {
    throw new Error('Yandex query report contains an invalid date range');
  }
  for (let date = start; date <= end; date += 86_400_000) {
    dates.push(new Date(date).toISOString().slice(0, 10));
  }
}
const weekDates = Array.from({ length: Math.ceil(dates.length / 7) }, (_, index) =>
  dates.slice(index * 7, (index + 1) * 7));
const weeks = weekDates.map((weekDates) => ({
  firstDate: weekDates[0] ?? null,
  lastDate: weekDates.at(-1) ?? null,
  days: weekDates.length,
  impressions: weekDates.reduce((sum, date) => sum + (daily.get(date)?.impressions ?? 0), 0),
  clicks: weekDates.reduce((sum, date) => sum + (daily.get(date)?.clicks ?? 0), 0),
}));

process.stdout.write(JSON.stringify({
  source: report.source,
  filter: report.filter,
  firstDate,
  lastDate,
  count: report.count,
  returned: report.returned,
  truncated: report.truncated,
  nonzeroQueries: queries.filter(({ impressions, clicks }) => impressions > 0 || clicks > 0).length,
  weeks,
  top,
}, null, 2) + '\n');
