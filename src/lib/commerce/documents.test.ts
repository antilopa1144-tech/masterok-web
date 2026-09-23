import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildDocumentTotals,
  generateProjectPdf,
  generateProjectXlsx,
  validateProjectDocumentInput,
  type ProjectDocumentInput,
} from './documents';

const input: ProjectDocumentInput = {
  project: { id: 'project-42', name: 'Квартира на Камчатке', documentDate: '2026-09-22', version: '3' },
  parties: { customer: { name: '=Заказчик', contact: '+7 900 000-00-00' }, object: 'Санузел, 3 этаж' },
  materials: [
    { key: 'tile', name: 'Керамогранит с очень длинным названием для проверки переноса строки в закупочном списке', subtitle: '60 × 120 см, матовый', unit: 'м²', quantity: 15.75, exactQuantity: 14.32, reservePercent: 10, packaging: 'Коробка 1,44 м²', unitPrice: { amount: 2490, currency: 'RUB', provenance: 'ввёл заказчик' } },
    { key: 'grout', name: 'Затирка', unit: 'кг', quantity: 3, unitPrice: { amount: 0, currency: 'RUB', provenance: 'материал заказчика' } },
    { key: 'primer', name: 'Грунтовка', unit: 'л', quantity: 5 },
  ],
  works: [{ key: 'laying', name: 'Укладка плитки', unit: 'м²', quantity: 15.75, unitPrice: { amount: 1800, currency: 'RUB', provenance: 'прайс подрядчика' } }],
  delivery: { note: 'Рассчитывается магазином отдельно' },
  monetaryReserve: { amount: { amount: 5000, currency: 'RUB', provenance: 'согласовано заказчиком' }, note: 'На непредвиденные расходы' },
  assumptions: ['Количество материалов сформировано по сохранённым расчётам проекта.'],
  terms: ['Цены действительны только как зафиксированные входные данные документа.'],
  layouts: [{ kind: 'tile', title: 'Раскладка пола', summary: 'Прямая раскладка от дальней стены.' }],
};

describe('project documents', () => {
  it('keeps an absent price distinct from an explicit zero price', () => {
    const totals = buildDocumentTotals(input);
    expect(totals.materialsKnownTotal).toBe(15.75 * 2490);
    expect(totals.worksKnownTotal).toBe(15.75 * 1800);
    expect(totals.monetaryReserveKnownTotal).toBe(5000);
    expect(totals.knownGrandTotal).toBe(15.75 * 2490 + 15.75 * 1800 + 5000);
    expect(totals.materials.find((line) => line.key === 'grout')).toMatchObject({ total: 0, priceKnown: true });
    expect(totals.materials.find((line) => line.key === 'primer')).toMatchObject({ priceKnown: false });
    expect(totals.materials.find((line) => line.key === 'primer')?.total).toBeUndefined();
    expect(totals.hasUnknownPrices).toBe(true);
  });

  it('rejects an image payload that only claims to be a PNG', () => {
    expect(() => buildDocumentTotals({
      ...input,
      layouts: [{
        kind: 'tile', title: 'Схема', summary: 'Проверка',
        image: { dataUrl: 'data:image/png;base64,aW5jb3JyZWN0', width: 1, height: 1 },
      }],
    })).toThrow('real PNG');
  });

  it('rejects malformed unknown endpoint payloads before property access or allocation', () => {
    expect(() => validateProjectDocumentInput(null)).toThrow('object');
    expect(() => validateProjectDocumentInput({ project: { id: 'p', name: 'Проект', documentDate: '2026-09-22' }, materials: [{}] })).toThrow('key');
    expect(() => validateProjectDocumentInput({ ...input, project: { ...input.project, documentDate: '2026-02-30' } })).toThrow('date');
    expect(() => validateProjectDocumentInput({ ...input, materials: [{ ...input.materials[0], key: 'same' }, { ...input.materials[1], key: 'same' }] })).toThrow('duplicated');
    expect(() => validateProjectDocumentInput({ ...input, materials: 'not-an-array' })).toThrow('materials');
    expect(() => validateProjectDocumentInput({ ...input, parties: { customer: { name: 42 } } })).toThrow('string');
    expect(() => validateProjectDocumentInput({ ...input, materials: [{ ...input.materials[0], quantity: Number.POSITIVE_INFINITY }], works: [] })).toThrow('finite');
    expect(() => validateProjectDocumentInput({ ...input, materials: [{ ...input.materials[0], unitPrice: { ...input.materials[0].unitPrice!, currency: 'USD' } }], works: [] })).toThrow('RUB');
  });

  it('requires an explicit monetary reserve amount when a percentage is supplied', () => {
    expect(() => validateProjectDocumentInput({ ...input, monetaryReserve: { percent: 10 } })).toThrow('amount');
    expect(() => validateProjectDocumentInput({ ...input, assumptions: Array.from({ length: 31 }, () => 'Допущение') })).toThrow('at most');
  });

  it('builds a Cyrillic multi-page PDF with a font embedded on the server', async () => {
    const longInput: ProjectDocumentInput = {
      ...input,
      materials: Array.from({ length: 65 }, (_, index) => ({
        ...input.materials[0],
        key: `tile-${index}`,
        name: `${input.materials[0].name} № ${index + 1}`,
      })),
    };
    const fontBase64 = readFileSync(resolve('public/fonts/Roboto-Regular.ttf')).toString('base64');
    const pdf = await generateProjectPdf(longInput, { fontBase64 });
    expect(pdf.byteLength).toBeGreaterThan(15_000);
    expect(new TextDecoder('latin1').decode(pdf.slice(0, 8))).toContain('%PDF');
    expect(new TextDecoder('latin1').decode(pdf)).toContain('/Roboto');
  });

  it('keeps a small client estimate and procurement list on one page', async () => {
    const fontBase64 = readFileSync(resolve('public/fonts/Roboto-Regular.ttf')).toString('base64');
    const pdf = await generateProjectPdf({
      ...input,
      materials: [input.materials[0]],
      works: [],
      layouts: [],
      assumptions: [],
      terms: [],
    }, { fontBase64 });
    const pageCount = (new TextDecoder('latin1').decode(pdf).match(/\/Type\s*\/Page\b/g) ?? []).length;
    expect(pageCount).toBe(1);
  });

  it('writes numeric formulas and neutralises spreadsheet formula injection', async () => {
    const ExcelJS = await import('exceljs');
    const bytes = await generateProjectXlsx(input);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as never);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Обзор', 'Смета', 'Закупка', 'Работы', 'Исходные данные']);
    const estimate = workbook.getWorksheet('Смета');
    expect(estimate?.getCell('E6').value).toBe(15.75);
    expect(estimate?.getCell('G6').value).toMatchObject({ formula: '=IF(F6="","",E6*F6)' });
    expect(estimate?.getCell('F7').value).toBe(0);
    expect(workbook.getWorksheet('Исходные данные')?.getCell('B6').value).toBe("'=Заказчик");
  }, 15_000);
  it('preserves layout images and recalculable full totals in a reloadable workbook', async () => {
    const ExcelJS = await import('exceljs');
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
    const demo = { ...input, works: [], layouts: [{ kind: 'tile' as const, title: 'Схема', summary: 'План', image: { dataUrl: png, width: 1, height: 1 } }] };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await generateProjectXlsx(demo)) as never);
    const overview = workbook.getWorksheet('Обзор')!;
    expect(overview.getCell('B10').result).toBe(buildDocumentTotals(demo).knownGrandTotal);
    expect(overview.getCell('B7').formula).toBe('=0');
    expect(overview.getCell('B8').formula).toContain("'Исходные данные'!B10");
    expect(overview.getCell('B9').formula).toContain("'Исходные данные'!B11");
    const images = workbook.getWorksheet('Раскладки')!.getImages();
    expect(images).toHaveLength(1);
    expect(images[0].range.br).toBeDefined();
    expect(workbook.getImage(Number(images[0].imageId)).extension).toBe('png');
    expect(workbook.getWorksheet('Исходные данные')!.getCell('E1').isMerged).toBe(false);
  });

});
