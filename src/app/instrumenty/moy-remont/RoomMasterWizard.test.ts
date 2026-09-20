/* @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PackRunResult } from "@/lib/room-master/run-pack";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const roomPack = vi.hoisted(() => ({ runRoomPack: vi.fn() }));
const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/components/calculator/SaveToProjectButton", () => ({
  default: () => null,
}));
vi.mock("@/components/tools/useToolAnalytics", () => ({
  useToolAnalytics: () => ({ markStarted: vi.fn(), selectMode: vi.fn() }),
}));
vi.mock("@/lib/calculators/meta.generated", () => ({
  getCalculatorMetaBySlug: () => null,
}));
vi.mock("@/lib/analytics", () => ({
  trackToolModeChange: vi.fn(),
  trackToolRelatedClick: vi.fn(),
}));
vi.mock("@/lib/room-master/run-pack", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/room-master/run-pack")>();
  return { ...original, runRoomPack: roomPack.runRoomPack };
});

import RoomMasterWizard from "./RoomMasterWizard";

function typeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")]
    .find((candidate) => candidate.textContent?.includes(label));
  if (!button) throw new Error(`Button not found: ${label}`);
  return button;
}

describe("RoomMasterWizard calculation revision", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    roomPack.runRoomPack.mockReset();
    router.replace.mockReset();
    window.requestAnimationFrame = vi.fn(() => 1);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(RoomMasterWizard)));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("does not apply a calculation that finished after the dimensions changed", async () => {
    let resolveRun: ((result: PackRunResult) => void) | undefined;
    roomPack.runRoomPack.mockImplementation(() => new Promise<PackRunResult>((resolve) => {
      resolveRun = resolve;
    }));

    const calculateButton = findButton(container, "Рассчитать материалы");
    await act(async () => calculateButton.click());
    expect(roomPack.runRoomPack).toHaveBeenCalledTimes(1);

    const lengthInput = container.querySelector<HTMLInputElement>('input[aria-label="Длина комнаты, м"]');
    if (!lengthInput) throw new Error("Length input not found");
    await act(async () => typeValue(lengthInput, "5"));

    expect(calculateButton.disabled).toBe(false);

    await act(async () => {
      resolveRun?.({
        packId: "bathroom",
        packTitle: "Ванная",
        steps: [{
          slug: "vannaya-komnata",
          title: "Плитка",
          result: { materials: [], totals: {}, warnings: [] },
        }],
        merged: { materials: [], totals: {}, warnings: [] },
      });
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain("Сводный расчёт");
  });
});
