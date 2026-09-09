import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, expect, it, vi } from "vitest";
import FeedbackWidget from "./FeedbackWidget";

vi.stubGlobal("React", React);
afterAll(() => vi.unstubAllGlobals());

it("marks the floating feedback control as excluded from print", () => {
  const html = renderToStaticMarkup(React.createElement(FeedbackWidget));
  expect(html).toContain('aria-label="Оставить отзыв"');
  expect(html).toContain('data-print-hide="true"');
});
