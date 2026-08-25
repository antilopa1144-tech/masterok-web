import { describe, expect, it } from "vitest";
import {
  formatTimerCountdown,
  formatTimerDuration,
  getRemainingSeconds,
  getTimerProgress,
  parseCustomMinutes,
} from "./timing";

describe("curing timer helpers", () => {
  it("retains an invalid custom duration instead of inventing a valid value", () => {
    expect(parseCustomMinutes("")).toEqual({ minutes: null, error: "Укажите время от 1 минуты" });
    expect(parseCustomMinutes("1.5")).toEqual({ minutes: null, error: "Укажите целое число минут" });
    expect(parseCustomMinutes("14401").minutes).toBeNull();
  });

  it("accepts the documented custom range", () => {
    expect(parseCustomMinutes("1")).toEqual({ minutes: 1, error: null });
    expect(parseCustomMinutes("14400")).toEqual({ minutes: 14400, error: null });
  });

  it("formats short, hour-long and multi-day durations", () => {
    expect(formatTimerDuration(30)).toBe("30 мин");
    expect(formatTimerDuration(90)).toBe("1 ч 30 мин");
    expect(formatTimerDuration(2880)).toBe("2 дн.");
  });

  it("formats a countdown and never exposes negative time", () => {
    expect(formatTimerCountdown(65)).toBe("1:05");
    expect(formatTimerCountdown(3661)).toBe("1:01:01");
    expect(formatTimerCountdown(-1)).toBe("0:00");
  });

  it("uses an absolute deadline so delayed browser ticks do not lose time", () => {
    expect(getRemainingSeconds(10_500, 10_000)).toBe(1);
    expect(getRemainingSeconds(9_000, 10_000)).toBe(0);
  });

  it("bounds progress between zero and one hundred percent", () => {
    expect(getTimerProgress(100, 75)).toBe(25);
    expect(getTimerProgress(100, 120)).toBe(0);
    expect(getTimerProgress(100, -10)).toBe(100);
  });
});
