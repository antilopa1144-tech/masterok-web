import { describe, expect, it } from "vitest";
import {
  buildFacadeSystemLinksFromInsulationResult,
  buildInsulationHrefFromFacadeResult,
  INSULATION_FACADE_TRANSFER_FROM,
} from "./facade-system-links";

describe("facade system links", () => {
  it("continues a compatible wet facade without inventing its finish or packaging", () => {
    const [link] = buildFacadeSystemLinksFromInsulationResult({
      application: 0,
      area: 84.125,
      mountSystem: 0,
      productForm: 0,
      insulationType: 1,
      thickness: 150,
    });
    const url = new URL(link.href, "https://getmasterok.ru");

    expect(link.target).toBe("uteplenie-fasada-minvatoj");
    expect(url.pathname).toBe("/kalkulyatory/fasad/uteplenie-fasada-minvatoj/");
    expect(url.searchParams.get("from")).toBe(INSULATION_FACADE_TRANSFER_FROM);
    expect(url.searchParams.get("area")).toBe("84.125");
    expect(url.searchParams.get("thickness")).toBe("150");
    expect(url.searchParams.get("insulationType")).toBe("1");
    expect(url.searchParams.has("finishType")).toBe(false);
    expect(url.searchParams.has("platesPerPack")).toBe(false);
  });

  it("does not reinterpret an unsupported wet-facade material or geometry", () => {
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 1, area: 80, mountSystem: 0 })).toEqual([]);
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 8, mountSystem: 0, productForm: 0, insulationType: 0, thickness: 100 })).toEqual([]);
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 80, mountSystem: 0, productForm: 1, insulationType: 0, thickness: 100 })).toEqual([]);
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 80, mountSystem: 0, productForm: 0, insulationType: 2, thickness: 100 })).toEqual([]);
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 80, mountSystem: 0, productForm: 0, insulationType: 0, thickness: 250 })).toEqual([]);
  });

  it("offers vent-facade finishes while transferring only the net area", () => {
    const links = buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 76.5, mountSystem: 1 });
    const byTarget = Object.fromEntries(links.map((link) => [link.target, new URL(link.href, "https://getmasterok.ru")]));

    expect(byTarget.sayding.searchParams.get("facadeArea")).toBe("76.5");
    expect(byTarget.sayding.searchParams.get("openingsArea")).toBe("0");
    expect(byTarget.sayding.searchParams.has("perimeter")).toBe(false);
    expect(byTarget.sayding.searchParams.has("height")).toBe(false);
    expect(byTarget.sayding.searchParams.has("cornersCount")).toBe(false);

    expect(byTarget["fasadnye-paneli"].searchParams.get("inputMode")).toBe("1");
    expect(byTarget["fasadnye-paneli"].searchParams.get("area")).toBe("76.5");
    expect(byTarget["fasadnye-paneli"].searchParams.has("panelUsefulArea")).toBe(false);
    expect(byTarget["fasadnye-paneli"].searchParams.has("profileStep")).toBe(false);
    expect(byTarget["fasadnye-paneli"].searchParams.has("fastenersPerPanel")).toBe(false);
  });

  it("omits siding below its field minimum but keeps facade panels", () => {
    expect(buildFacadeSystemLinksFromInsulationResult({ application: 0, area: 6, mountSystem: 1 }).map((link) => link.target))
      .toEqual(["fasadnye-paneli"]);
  });

  it("returns from cladding to vent-facade insulation using calculated net area", () => {
    const sidingUrl = new URL(buildInsulationHrefFromFacadeResult("sayding", { netArea: 92 })!, "https://getmasterok.ru");
    const panelsUrl = new URL(buildInsulationHrefFromFacadeResult("fasadnye-paneli", { area: 88.75 })!, "https://getmasterok.ru");

    expect(sidingUrl.pathname).toBe("/kalkulyatory/fasad/uteplenie/");
    expect(sidingUrl.searchParams.get("from")).toBe("sayding");
    expect(sidingUrl.searchParams.get("application")).toBe("0");
    expect(sidingUrl.searchParams.get("area")).toBe("92");
    expect(sidingUrl.searchParams.get("mountSystem")).toBe("1");
    expect(sidingUrl.searchParams.has("insulationType")).toBe(false);
    expect(sidingUrl.searchParams.has("thickness")).toBe(false);

    expect(panelsUrl.searchParams.get("from")).toBe("fasadnye-paneli");
    expect(panelsUrl.searchParams.get("area")).toBe("88.75");
  });

  it("refuses facade areas outside the receiving insulation range", () => {
    expect(buildInsulationHrefFromFacadeResult("sayding", { netArea: 0 })).toBeNull();
    expect(buildInsulationHrefFromFacadeResult("fasadnye-paneli", { area: 501 })).toBeNull();
  });
});
