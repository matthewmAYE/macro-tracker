import { describe, expect, it } from "vitest";
import { caloriesFromMacros, netCarbs, scaleMacros, toGrams } from "./nutrition";

describe("caloriesFromMacros", () => {
  it("uses net carbs (total minus fiber)", () => {
    // 30P, 40C total, 10 fiber, 10F → 4*30 + 4*(40-10) + 9*10 = 330
    expect(caloriesFromMacros({ protein: 30, carbs: 40, fat: 10, fiber: 10 })).toBe(330);
  });

  it("never counts negative net carbs", () => {
    expect(caloriesFromMacros({ protein: 0, carbs: 5, fat: 0, fiber: 8 })).toBe(0);
  });

  it("matches the quick-add example: fat only", () => {
    expect(caloriesFromMacros({ protein: 0, carbs: 0, fat: 1, fiber: 0 })).toBe(9);
  });
});

describe("netCarbs", () => {
  it("subtracts fiber from total carbs", () => {
    expect(netCarbs({ carbs: 50, fiber: 12 })).toBe(38);
  });
  it("floors at zero", () => {
    expect(netCarbs({ carbs: 3, fiber: 5 })).toBe(0);
  });
});

describe("toGrams", () => {
  it("converts mass units", () => {
    expect(toGrams(100, "g")).toBe(100);
    expect(toGrams(1, "oz")).toBeCloseTo(28.3495);
    expect(toGrams(2, "lb")).toBeCloseTo(907.184);
  });

  it("converts volume units via the food's portion weight", () => {
    expect(toGrams(2, "tbsp", 16)).toBe(32); // peanut butter: 1 tbsp = 16 g
  });

  it("throws for volume units without a portion weight", () => {
    expect(() => toGrams(1, "cup")).toThrow(/portion weight/);
  });
});

describe("scaleMacros", () => {
  const chickenBreastCooked = { protein: 31, carbs: 0, fat: 3.6, fiber: 0 }; // per 100 g

  it("scales per-100g values to the gram amount", () => {
    const six_oz = toGrams(6, "oz"); // 170.097 g
    const scaled = scaleMacros(chickenBreastCooked, six_oz);
    expect(scaled.protein).toBeCloseTo(52.7, 1);
    expect(scaled.fat).toBeCloseTo(6.1, 1);
    expect(scaled.calories).toBeCloseTo(4 * scaled.protein + 9 * scaled.fat, 5);
  });

  it("recomputes calories from scaled macros with the net-carb rule", () => {
    const per100 = { protein: 10, carbs: 20, fat: 5, fiber: 8 };
    const scaled = scaleMacros(per100, 50);
    expect(scaled.calories).toBeCloseTo(4 * 5 + 4 * (10 - 4) + 9 * 2.5, 5);
  });
});
