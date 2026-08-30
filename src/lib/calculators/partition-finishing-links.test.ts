import { describe, expect, it } from "vitest";
import {
  buildPartitionFinishingLinks,
  getPartitionFinishingArea,
  PARTITION_FINISHING_TRANSFER_FROM,
} from "./partition-finishing-links";

describe("partition finishing links", () => {
  it("transfers the area of both partition sides", () => {
    expect(getPartitionFinishingArea({ length: 5, height: 2.7 })).toBe(27);
  });

  it("builds target-specific links without inventing openings or finish systems", () => {
    const links = buildPartitionFinishingLinks({ length: 5, height: 2.7 });
    const byTarget = Object.fromEntries(links.map((link) => [link.target, new URL(link.href, "https://getmasterok.ru")]));

    expect(byTarget.gruntovka.pathname).toBe("/kalkulyatory/otdelka/gruntovka/");
    expect(byTarget.gruntovka.searchParams.get("from")).toBe(PARTITION_FINISHING_TRANSFER_FROM);
    expect(byTarget.gruntovka.searchParams.get("area")).toBe("27");
    expect(byTarget.gruntovka.searchParams.get("surfaceType")).toBe("0");
    expect(byTarget.gruntovka.searchParams.get("primerType")).toBe("0");
    expect(byTarget.gruntovka.searchParams.has("coats")).toBe(false);

    expect(byTarget.shtukaturka.pathname).toBe("/kalkulyatory/steny/shtukaturka/");
    expect(byTarget.shtukaturka.searchParams.get("inputMode")).toBe("1");
    expect(byTarget.shtukaturka.searchParams.get("openingsArea")).toBe("0");
    expect(byTarget.shtukaturka.searchParams.has("plasterType")).toBe(false);
    expect(byTarget.shtukaturka.searchParams.has("thickness")).toBe(false);

    expect(byTarget.shpaklevka.pathname).toBe("/kalkulyatory/otdelka/shpaklevka/");
    expect(byTarget.shpaklevka.searchParams.get("inputMode")).toBe("1");
    expect(byTarget.shpaklevka.searchParams.get("surface")).toBe("0");
    expect(byTarget.shpaklevka.searchParams.has("puttyType")).toBe(false);
    expect(byTarget.shpaklevka.searchParams.has("qualityClass")).toBe(false);
  });

  it("refuses invalid or unsupported transferred areas", () => {
    expect(buildPartitionFinishingLinks({ length: Number.NaN, height: 2.7 })).toEqual([]);
    expect(buildPartitionFinishingLinks({ length: 100, height: 3 })).toEqual([]);
  });
});
