import { describe, expect, it } from "vitest";
import { calculateWallSlatLayout } from "./wall-slat-layout";
import {
  buildLinearCutHrefFromWallSlat,
  readWallSlatCutTransfer,
  WALL_SLAT_TRANSFER_FROM,
} from "./wall-slat-to-linear-cut";

function makeLayout(overrides: Partial<Parameters<typeof calculateWallSlatLayout>[0]> = {}) {
  return calculateWallSlatLayout({
    wallWidthMm: 3000,
    wallHeightMm: 2700,
    slatWidthMm: 30,
    desiredGapMm: 20,
    desiredCount: 40,
    mode: "by-gap",
    stockLengthMm: 3000,
    reservePercent: 5,
    ...overrides,
  });
}

describe("wall slat to linear cut transfer", () => {
  it("transfers one vertical part type and the stock length", () => {
    const result = makeLayout();
    const url = new URL(buildLinearCutHrefFromWallSlat(result)!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/lineynyy-raskroy/");
    expect(url.searchParams.get("from")).toBe(WALL_SLAT_TRANSFER_FROM);
    expect(url.searchParams.get("stockLengthMm")).toBe("3000");
    expect(url.searchParams.get("partLengthMm")).toBe("2700");
    expect(url.searchParams.get("quantity")).toBe(String(result.slatCount));
    expect(url.searchParams.get("reservePercent")).toBe("5");
    expect(url.searchParams.get("safeStockHint")).toBe(String(result.purchasePieces));
    expect(url.searchParams.has("sawKerfMm")).toBe(false);
  });

  it("reads only complete authorised transfers", () => {
    const params = new URLSearchParams({
      from: WALL_SLAT_TRANSFER_FROM,
      stockLengthMm: "3000",
      partLengthMm: "2700",
      quantity: "60",
      reservePercent: "5",
      safeStockHint: "63",
    });
    expect(readWallSlatCutTransfer(params)).toEqual({
      stockLengthMm: 3000,
      partLengthMm: 2700,
      quantity: 60,
      reservePercent: 5,
      safeStockHint: 63,
    });

    params.delete("quantity");
    expect(readWallSlatCutTransfer(params)).toBeNull();
    params.set("quantity", "60");
    params.set("from", "unknown");
    expect(readWallSlatCutTransfer(params)).toBeNull();
  });

  it("refuses a vertical that needs an unspecified joint", () => {
    expect(buildLinearCutHrefFromWallSlat(makeLayout({ wallHeightMm: 3500 }))).toBeNull();
  });

  it("refuses more parts than the linear tool accepts in one row", () => {
    const result = makeLayout({
      wallWidthMm: 30_000,
      slatWidthMm: 5,
      desiredGapMm: 0,
      mode: "by-gap",
    });
    expect(result.slatCount).toBeGreaterThan(200);
    expect(buildLinearCutHrefFromWallSlat(result)).toBeNull();
  });
});
