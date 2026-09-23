import { describe, expect, it } from 'vitest';

import { getProjectLayouts, MAX_PROJECT_LAYOUTS, PROJECT_LAYOUTS_STORAGE_KEY, saveProjectLayout } from './project-layouts';

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
}

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const draft = (fingerprint = 'tile-1') => ({ kind: 'tile' as const, title: 'Раскладка плитки', summary: 'Пол 3 × 4 м', imageDataUrl: png, sourceLabel: 'tile-layout/v1', sourceFingerprint: fingerprint });

describe('project layouts', () => {
  it('keeps layouts isolated by project and returns the document-compatible shape', () => {
    const local = storage();
    saveProjectLayout(local, 'project-a', draft(), 1);
    saveProjectLayout(local, 'project-b', draft('tile-2'), 2);
    expect(getProjectLayouts(local, 'project-a')).toEqual([expect.objectContaining({ kind: 'tile', image: expect.objectContaining({ width: 1, height: 1 }) })]);
    expect(getProjectLayouts(local, 'project-b')).toHaveLength(1);
    expect(JSON.parse(local.getItem(PROJECT_LAYOUTS_STORAGE_KEY) ?? '{}')['project-a']).toHaveLength(1);
  });

  it('updates the same source fingerprint and enforces five snapshots per project', () => {
    const local = storage();
    saveProjectLayout(local, 'project-a', draft('same'), 1);
    saveProjectLayout(local, 'project-a', { ...draft('same'), summary: 'Обновлённая схема' }, 2);
    expect(getProjectLayouts(local, 'project-a')).toEqual([expect.objectContaining({ summary: 'Обновлённая схема' })]);
    for (let index = 0; index < MAX_PROJECT_LAYOUTS - 1; index++) saveProjectLayout(local, 'project-a', draft(`new-${index}`), index + 3);
    expect(() => saveProjectLayout(local, 'project-a', draft('too-many'))).toThrow('не более');
  });

  it('rejects non-PNG image data before writing to local storage', () => {
    const local = storage();
    expect(() => saveProjectLayout(local, 'project-a', { ...draft(), imageDataUrl: 'data:image/png;base64,aGVsbG8=' })).toThrow('проверить PNG');
  });
});
