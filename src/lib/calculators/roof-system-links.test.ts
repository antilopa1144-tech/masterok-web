import { describe, expect, it } from "vitest";
import {
  buildRoofingHrefFromGuttersResult,
  buildRoofingLinksFromRoofingResult,
  buildRoofingLinksFromSoftRoofingResult,
  GUTTERS_TRANSFER_FROM,
  ROOFING_TRANSFER_FROM,
  SOFT_ROOFING_TRANSFER_FROM,
} from "./roof-system-links";

describe("roof system links", () => {
  it("continues an explicit soft-roofing project with compatible geometry", () => {
    const links = buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 126.5, roofingType: 1, roofAreaMode: 1, slopeDeg: 28 },
      { ridgeProjectM: 9, eavesProjectM: 24, valleyProjectM: 4.5 },
    );
    const soft = new URL(links.find((link) => link.target === SOFT_ROOFING_TRANSFER_FROM)!.href, "https://getmasterok.ru");

    expect(soft.pathname).toBe("/kalkulyatory/krovlya/myagkaya-krovlya/");
    expect(soft.searchParams.get("from")).toBe(ROOFING_TRANSFER_FROM);
    expect(soft.searchParams.get("roofArea")).toBe("126.5");
    expect(soft.searchParams.get("slope")).toBe("28");
    expect(soft.searchParams.get("ridgeLength")).toBe("9");
    expect(soft.searchParams.get("eaveLength")).toBe("24");
    expect(soft.searchParams.get("valleyLength")).toBe("4.5");
  });

  it("does not transfer a hidden slope when the area came from project measurements", () => {
    const [soft] = buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 90, roofingType: 1, roofAreaMode: 0, slopeDeg: 30 },
      { ridgeProjectM: 0, eavesProjectM: 0, valleyProjectM: 0 },
    );
    const url = new URL(soft.href, "https://getmasterok.ru");

    expect(soft.target).toBe(SOFT_ROOFING_TRANSFER_FROM);
    expect(url.searchParams.has("slope")).toBe(false);
    expect(url.searchParams.get("ridgeLength")).toBe("0");
    expect(url.searchParams.get("eaveLength")).toBe("0");
  });

  it("does not reinterpret another covering or unsupported soft-roof geometry", () => {
    expect(buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 90, roofingType: 0, roofAreaMode: 0 },
      {},
    ).map((link) => link.target)).toEqual([GUTTERS_TRANSFER_FROM]);

    expect(buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 90, roofingType: 1, roofAreaMode: 1, slopeDeg: 8 },
      {},
    ).map((link) => link.target)).toEqual([GUTTERS_TRANSFER_FROM]);

    expect(buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 90, roofingType: 1, roofAreaMode: 0 },
      { ridgeProjectM: 60 },
    ).map((link) => link.target)).toEqual([GUTTERS_TRANSFER_FROM]);
  });

  it("sends only slope area to gutters and leaves the drainage geometry unset", () => {
    const links = buildRoofingLinksFromRoofingResult(
      { selectedSlopeAreaM2: 144, roofingType: 0, roofAreaMode: 0 },
      {},
    );
    const gutters = new URL(links[0].href, "https://getmasterok.ru");

    expect(gutters.pathname).toBe("/kalkulyatory/krovlya/vodostok/");
    expect(gutters.searchParams.get("from")).toBe(ROOFING_TRANSFER_FROM);
    expect(gutters.searchParams.get("roofArea")).toBe("144");
    expect(gutters.searchParams.has("roofPerimeter")).toBe(false);
    expect(gutters.searchParams.has("roofHeight")).toBe(false);
    expect(gutters.searchParams.has("funnels")).toBe(false);
  });

  it("returns from soft roofing to the full bill and gutters", () => {
    const links = buildRoofingLinksFromSoftRoofingResult({
      roofArea: 112,
      ridgeLength: 8,
      eaveLength: 22,
      valleyLength: 3,
    });
    const byTarget = Object.fromEntries(links.map((link) => [link.target, new URL(link.href, "https://getmasterok.ru")]));

    expect(byTarget.krovlya.searchParams.get("from")).toBe(SOFT_ROOFING_TRANSFER_FROM);
    expect(byTarget.krovlya.searchParams.get("roofAreaMode")).toBe("0");
    expect(byTarget.krovlya.searchParams.get("projectSlopeAreaM2")).toBe("112");
    expect(byTarget.krovlya.searchParams.get("roofingType")).toBe("1");
    expect(byTarget.krovlya.searchParams.get("ridgeProjectM")).toBe("8");
    expect(byTarget.krovlya.searchParams.get("eavesProjectM")).toBe("22");
    expect(byTarget.vodostok.searchParams.get("roofArea")).toBe("112");
  });

  it("returns from gutters with area only and rejects out-of-range values", () => {
    const href = buildRoofingHrefFromGuttersResult({ roofArea: 240 });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/krovlya/krovlya/");
    expect(url.searchParams.get("from")).toBe(GUTTERS_TRANSFER_FROM);
    expect(url.searchParams.get("roofAreaMode")).toBe("0");
    expect(url.searchParams.get("projectSlopeAreaM2")).toBe("240");
    expect(url.searchParams.has("roofingType")).toBe(false);
    expect(buildRoofingHrefFromGuttersResult({ roofArea: 1001 })).toBeNull();
  });
});
