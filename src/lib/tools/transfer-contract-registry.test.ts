import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_CALCULATORS } from "@/lib/calculators";
import { TOOL_CONFIGS } from "@/lib/tools/config";
import { TRANSFER_CONTRACT_REGISTRY } from "@/lib/tools/transfer-contract-registry";

const toolsDir = path.resolve(process.cwd(), "src/lib/tools");
const transferModulePattern = /(?:-to-calc|-to-ceiling|-to-linear-cut|-to-renovation-cost|-links)\.ts$/;

describe("реестр переходов между инструментами и калькуляторами", () => {
  it("покрывает каждый transfer-модуль и требует отдельный unit-тест", () => {
    const discoveredModules = fs.readdirSync(toolsDir)
      .filter((name) => transferModulePattern.test(name) && !name.endsWith(".test.ts"))
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();
    const registeredModules = TRANSFER_CONTRACT_REGISTRY
      .map((contract) => contract.moduleName)
      .sort();

    expect(registeredModules).toEqual(discoveredModules);
    for (const moduleName of registeredModules) {
      expect(fs.existsSync(path.join(toolsDir, `${moduleName}.test.ts`))).toBe(true);
    }
  });

  it("содержит уникальные id и имена модулей", () => {
    const ids = TRANSFER_CONTRACT_REGISTRY.map((contract) => contract.id);
    const modules = TRANSFER_CONTRACT_REGISTRY.map((contract) => contract.moduleName);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(modules).size).toBe(modules.length);
  });

  it("ссылается только на опубликованные инструменты и калькуляторы", () => {
    const toolSlugs = new Set(TOOL_CONFIGS.map((toolConfig) => toolConfig.slug));
    const calculatorSlugs = new Set(ALL_CALCULATORS.map((calculator) => calculator.slug));

    for (const contract of TRANSFER_CONTRACT_REGISTRY) {
      expect(contract.sources.length, `${contract.id}: нет источника`).toBeGreaterThan(0);
      expect(contract.targets.length, `${contract.id}: нет назначения`).toBeGreaterThan(0);

      for (const endpoint of [...contract.sources, ...contract.targets]) {
        const catalog = endpoint.kind === "tool" ? toolSlugs : calculatorSlugs;
        expect(catalog.has(endpoint.slug), `${contract.id}: ${endpoint.kind}/${endpoint.slug}`).toBe(true);
      }
    }
  });
});
