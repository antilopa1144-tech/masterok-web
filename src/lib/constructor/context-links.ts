import type { ConstructorScenario } from "./entry";

interface ConstructorContext { scenario: ConstructorScenario; title: string; description: string }
const laminate: ConstructorContext = { scenario: "laminate", title: "Проверьте раскладку ламината в 3D", description: "Задайте длину и ширину комнаты, сравните направление досок и подрезки. Получите общую ведомость с резервом и округлением до упаковок." };
const tile: ConstructorContext = { scenario: "tile", title: "Разложите плитку на полу в 3D", description: "Задайте размеры комнаты, формат плитки и шов. Проверьте крайние подрезки и количество упаковок к покупке." };
const bathroom: ConstructorContext = { scenario: "bathroom", title: "Спланируйте плитку в ванной в 3D", description: "Задайте размеры и проёмы, выберите плитку на полу и стенах. Посмотрите развёртки и соберите ведомость материалов." };
const contexts: Record<string, ConstructorContext> = { laminat: laminate, plitka: tile, zatirka: bathroom, "klej-dlya-plitki": bathroom, "vannaya-komnata": bathroom };

/** Deliberately narrow: no room tile CTA for paving or unrelated floor materials. */
export function constructorContext(calculatorSlug?: string): ConstructorContext | undefined {
  return calculatorSlug ? contexts[calculatorSlug] : undefined;
}
