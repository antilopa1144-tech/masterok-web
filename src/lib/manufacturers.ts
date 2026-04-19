import manufacturersData from "../../configs/manufacturers.json";

export interface ManufacturerItem {
  name: string;
  country?: string;
  specs: Record<string, unknown>;
  notes?: string;
}

export interface ManufacturerCategory {
  label: string;
  items: ManufacturerItem[];
}

type ManufacturersMap = Record<string, ManufacturerCategory>;

const DATA = manufacturersData as unknown as ManufacturersMap & { $schema?: string };

export function getManufacturerCategory(categoryKey: string): ManufacturerCategory | null {
  const entry = DATA[categoryKey];
  if (!entry || typeof entry !== "object" || !("items" in entry)) return null;
  return entry;
}

export function listManufacturerCategories(): string[] {
  return Object.keys(DATA).filter((k) => k !== "$schema");
}

export function getManufacturerByName(
  categoryKey: string,
  name: string
): ManufacturerItem | null {
  const cat = getManufacturerCategory(categoryKey);
  if (!cat) return null;
  return cat.items.find((i) => i.name === name) ?? null;
}
