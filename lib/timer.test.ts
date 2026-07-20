import { describe, expect, it } from "vitest";
import { formatTimerMessage, formatElapsedSeconds } from "./timer";

describe("formatTimerMessage", () => {
  it("produces 'HH:MM, Xs' from current time and elapsed seconds", () => {
    expect(formatTimerMessage("14:35", 47)).toBe("14:35, 47s");
  });

  it("handles 0 seconds", () => {
    expect(formatTimerMessage("09:00", 0)).toBe("09:00, 0s");
  });

  it("handles large values (e.g. hour-long session)", () => {
    expect(formatTimerMessage("23:59", 3600)).toBe("23:59, 3600s");
  });

  it("uses the time string exactly as provided (no reformatting)", () => {
    expect(formatTimerMessage("00:00", 1)).toBe("00:00, 1s");
  });
});

describe("formatElapsedSeconds", () => {
  it("computes integer seconds from two epoch timestamps", () => {
    expect(formatElapsedSeconds(1000, 48000)).toBe(47);
  });

  it("rounds to nearest second", () => {
    expect(formatElapsedSeconds(0, 500)).toBe(1);
    expect(formatElapsedSeconds(0, 499)).toBe(0);
  });

  it("returns 0 when stop equals start", () => {
    expect(formatElapsedSeconds(5000, 5000)).toBe(0);
  });
});
