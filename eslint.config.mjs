import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// Сохраняем прежние обязательные проверки Hooks. Новые compiler-диагностики
// показываем предупреждениями: React Compiler в этой миграции не включается.
const establishedHookRules = new Set([
  "react-hooks/rules-of-hooks",
  "react-hooks/exhaustive-deps",
]);
const compilerWarnings = Object.fromEntries(
  nextVitals.flatMap((config) => Object.keys(config.rules ?? {}))
    .filter((rule) => rule.startsWith("react-hooks/") && !establishedHookRules.has(rule))
    .map((rule) => [rule, "warn"]),
);

export default defineConfig([
  ...nextVitals,
  { rules: compilerWarnings },
  globalIgnores([".next*/**", "output/**", "out/**", "build/**", "next-env.d.ts"]),
]);
