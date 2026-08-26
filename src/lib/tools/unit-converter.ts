export function parseUnitValue(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function convertLinearUnit(value: number, fromBase: number, toBase: number): number {
  return (value * fromBase) / toBase;
}

export function convertTemperature(value: number, from: string, to: string): number {
  let celsius: number;
  if (from === "c") celsius = value;
  else if (from === "f") celsius = ((value - 32) * 5) / 9;
  else celsius = value - 273.15;

  if (to === "c") return celsius;
  if (to === "f") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

export function formatConvertedValue(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 0.001 && abs < 1e10) {
    const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return value.toLocaleString("ru-RU", {
      maximumFractionDigits: decimals,
      minimumFractionDigits: 0,
    });
  }
  return value.toExponential(4);
}
