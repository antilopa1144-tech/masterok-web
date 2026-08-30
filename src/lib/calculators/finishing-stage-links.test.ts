import { describe, expect, it } from "vitest";
import {
  buildFinishLinksFromPuttyResult,
  buildPuttyHrefFromPlasterResult,
  PLASTER_FINISHING_TRANSFER_FROM,
  PUTTY_FINISHING_TRANSFER_FROM,
} from "./finishing-stage-links";

describe("finishing stage links", () => {
  it("transfers only the net plaster area to putty", () => {
    const href = buildPuttyHrefFromPlasterResult({ netArea: 42.125, wallArea: 50 });
    const url = new URL(href!, "https://getmasterok.ru");

    expect(url.pathname).toBe("/kalkulyatory/otdelka/shpaklevka/");
    expect(url.searchParams.get("from")).toBe(PLASTER_FINISHING_TRANSFER_FROM);
    expect(url.searchParams.get("inputMode")).toBe("1");
    expect(url.searchParams.get("area")).toBe("42.125");
    expect(url.searchParams.get("surface")).toBe("0");
    expect(url.searchParams.has("puttyType")).toBe(false);
    expect(url.searchParams.has("qualityClass")).toBe(false);
  });

  it("does not transfer invalid plaster areas", () => {
    expect(buildPuttyHrefFromPlasterResult({ netArea: 0 })).toBeNull();
    expect(buildPuttyHrefFromPlasterResult({ netArea: 501 })).toBeNull();
  });

  it("builds wall-only finish choices without inventing product parameters", () => {
    const links = buildFinishLinksFromPuttyResult({ wallArea: 48 }, 0);
    const byTarget = Object.fromEntries(links.map((link) => [link.target, new URL(link.href, "https://getmasterok.ru")]));

    expect(byTarget.gruntovka.searchParams.get("from")).toBe(PUTTY_FINISHING_TRANSFER_FROM);
    expect(byTarget.gruntovka.searchParams.get("area")).toBe("48");
    expect(byTarget.gruntovka.searchParams.has("coats")).toBe(false);

    expect(byTarget.kraska.pathname).toBe("/kalkulyatory/otdelka/kraska/");
    expect(byTarget.kraska.searchParams.get("surfaceType")).toBe("0");
    expect(byTarget.kraska.searchParams.get("surfacePrep")).toBe("0");
    expect(byTarget.kraska.searchParams.has("coats")).toBe(false);
    expect(byTarget.kraska.searchParams.has("consumption")).toBe(false);

    expect(byTarget.oboi.pathname).toBe("/kalkulyatory/otdelka/oboi/");
    expect(byTarget.oboi.searchParams.get("inputMode")).toBe("1");
    expect(byTarget.oboi.searchParams.get("openingsArea")).toBe("0");
    expect(byTarget.oboi.searchParams.has("height")).toBe(false);
    expect(byTarget.oboi.searchParams.has("rollWidth")).toBe(false);
  });

  it("does not offer a wall finish for ceiling or mixed putty areas", () => {
    expect(buildFinishLinksFromPuttyResult({ wallArea: 48 }, 1)).toEqual([]);
    expect(buildFinishLinksFromPuttyResult({ wallArea: 48 }, 2)).toEqual([]);
  });

  it("omits primer above its field limit but keeps the 1000 m² finish targets", () => {
    expect(buildFinishLinksFromPuttyResult({ wallArea: 750 }, 0).map((link) => link.target)).toEqual(["kraska", "oboi"]);
    expect(buildFinishLinksFromPuttyResult({ wallArea: 1001 }, 0)).toEqual([]);
  });
});
