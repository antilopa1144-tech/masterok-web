import { describe, expect, it } from "vitest";
import { calculateDeckLayout } from "./deck-layout";
import {
  buildDeckLayoutHrefFromTerraceResult,
  buildTerraceCalculatorHrefFromDeckLayout,
  DECK_LAYOUT_TRANSFER_FROM,
  readDeckLayoutTransfer,
  TERRACE_CALCULATOR_TRANSFER_FROM,
} from "./deck-layout-to-calc";

describe("deck layout calculator transfer", () => {
  it("transfers calculator geometry and product dimensions to the layout", () => {
    const href = buildDeckLayoutHrefFromTerraceResult({
      length: 5.5,
      width: 3,
      boardLength: 4000,
      boardWidth: 140,
      gap: 6,
      boardReservePercent: 12,
    });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/instrumenty/raskladka-terrasnoy-doski/");
    expect(url.searchParams.get("from")).toBe(TERRACE_CALCULATOR_TRANSFER_FROM);
    expect(url.searchParams.get("deckLengthMm")).toBe("5500");
    expect(url.searchParams.get("deckWidthMm")).toBe("3000");
    expect(url.searchParams.get("boardLengthMm")).toBe("4000");
    expect(url.searchParams.get("boardWidthMm")).toBe("140");
    expect(url.searchParams.get("gapMm")).toBe("6");
    expect(url.searchParams.get("reservePercent")).toBe("12");
    expect(url.searchParams.has("orientation")).toBe(false);
    expect(url.searchParams.has("stagger")).toBe(false);
  });

  it("reads only complete and authorised layout transfers", () => {
    const valid = new URLSearchParams({
      from: TERRACE_CALCULATOR_TRANSFER_FROM,
      deckLengthMm: "5500",
      deckWidthMm: "3000",
      boardLengthMm: "4000",
      boardWidthMm: "140",
      gapMm: "6",
      reservePercent: "12",
    });
    expect(readDeckLayoutTransfer(valid)).toEqual({
      deckLengthMm: 5500,
      deckWidthMm: 3000,
      boardLengthMm: 4000,
      boardWidthMm: 140,
      gapMm: 6,
      reservePercent: 12,
    });

    valid.delete("gapMm");
    expect(readDeckLayoutTransfer(valid)).toBeNull();
    valid.set("gapMm", "6");
    valid.set("from", "unknown");
    expect(readDeckLayoutTransfer(valid)).toBeNull();
  });

  it("returns an along-length layout to equivalent calculator dimensions", () => {
    const result = calculateDeckLayout({
      deckLengthMm: 5500,
      deckWidthMm: 3000,
      boardLengthMm: 4000,
      boardWidthMm: 140,
      gapMm: 6,
      orientation: "along-length",
      stagger: "half",
      sawKerfMm: 3,
      reservePercent: 12,
    });
    const url = new URL(buildTerraceCalculatorHrefFromDeckLayout(result)!, "https://getmasterok.ru");

    expect(url.searchParams.get("from")).toBe(DECK_LAYOUT_TRANSFER_FROM);
    expect(url.searchParams.get("length")).toBe("5.5");
    expect(url.searchParams.get("width")).toBe("3");
    expect(url.searchParams.get("offcutReuseMode")).toBe("1");
    expect(url.searchParams.get("layoutBoardsHint")).toBe(String(result.purchaseBoards));
    expect(url.searchParams.has("lagStep")).toBe(false);
    expect(url.searchParams.has("clipsPerIntersection")).toBe(false);
  });

  it("swaps calculator sides for boards laid along the tool width", () => {
    const result = calculateDeckLayout({
      deckLengthMm: 6000,
      deckWidthMm: 3500,
      boardLengthMm: 3000,
      boardWidthMm: 150,
      gapMm: 5,
      orientation: "along-width",
      stagger: "half",
      sawKerfMm: 3,
      reservePercent: 10,
    });
    const url = new URL(buildTerraceCalculatorHrefFromDeckLayout(result)!, "https://getmasterok.ru");

    expect(url.searchParams.get("length")).toBe("3.5");
    expect(url.searchParams.get("width")).toBe("6");
  });

  it("refuses dimensions the receiving calculator cannot represent", () => {
    const result = calculateDeckLayout({
      deckLengthMm: 20000,
      deckWidthMm: 3000,
      boardLengthMm: 3000,
      boardWidthMm: 150,
      gapMm: 5,
      orientation: "along-width",
      stagger: "half",
      sawKerfMm: 3,
      reservePercent: 10,
    });
    expect(buildTerraceCalculatorHrefFromDeckLayout(result)).toBeNull();
    expect(buildDeckLayoutHrefFromTerraceResult({ length: 5, width: 3, boardLength: 4000, boardWidth: 140, gap: 6, boardReservePercent: 31 })).toBeNull();
  });
});
