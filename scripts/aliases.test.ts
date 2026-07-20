import { describe, expect, it } from "vitest";
import { ALIASES, expandAliases } from "./aliases";

// Guards against typos in ALIASES that would otherwise silently do nothing.
describe("ALIASES table integrity", () => {
  it("uses lowercase single-spaced canonical keys", () => {
    for (const key of Object.keys(ALIASES)) {
      expect(key, `key "${key}"`).toBe(key.toLowerCase());
      expect(key).not.toMatch(/\s{2,}/);
      expect(key).toMatch(/^[a-z][a-z0-9 ]*[a-z0-9]$/);
    }
  });

  it("has no duplicate or empty synonyms per key", () => {
    for (const [key, syns] of Object.entries(ALIASES)) {
      const dedup = new Set(syns);
      expect(dedup.size, `duplicates under "${key}"`).toBe(syns.length);
      for (const s of syns) {
        expect(s.trim(), `empty synonym under "${key}"`).not.toBe("");
        expect(s, `synonym "${s}" under "${key}"`).toBe(s.toLowerCase());
      }
    }
  });
});

// Alias expansion should hit when a member description contains the canonical
// phrase, ignore it otherwise, and apply equally to raw and cooked USDA rows.
describe("expandAliases", () => {
  it("matches multi-word canonicals as whole phrases in the description", () => {
    const tokens = new Set(["beef", "round", "top", "raw"]);
    const added = expandAliases(tokens, [
      "beef round top round separable lean and fat all grades raw",
    ]);
    expect(added.has("london")).toBe(true);
    expect(added.has("broil")).toBe(true);
    expect(added.has("inside")).toBe(true);
  });

  it("does not fire when the canonical phrase is absent", () => {
    // "top" and "round" appear as separate tokens but not the phrase
    // "top round" — the london-broil alias must not trigger.
    const added = expandAliases(new Set(), [
      "beef round tip trimmed to 1 8 fat raw top blade",
    ]);
    expect(added.has("london")).toBe(false);
    expect(added.has("broil")).toBe(false);
  });

  it("attaches aliases to cooked beef descriptions the same way as raw", () => {
    const cookedAdded = expandAliases(new Set(), [
      "beef loin top sirloin steak cooked broiled",
    ]);
    expect(cookedAdded.has("sirloin")).toBe(true);
    expect(cookedAdded.has("coulotte")).toBe(true);

    const rawAdded = expandAliases(new Set(), [
      "beef loin top sirloin steak raw",
    ]);
    expect(rawAdded.has("coulotte")).toBe(true);
  });

  it("skips words already present in the token set (no-op dedupe)", () => {
    const tokens = new Set(["chickpea", "garbanzo"]);
    const added = expandAliases(tokens, ["chickpea cooked"]);
    expect(added.has("garbanzo")).toBe(false); // already in tokens
    expect(added.has("garbanzos")).toBe(true); // still added
    expect(added.has("ceci")).toBe(true);
  });

  it("fires on the pomelo/pummelo roadmap example", () => {
    const added = expandAliases(new Set(), ["pummelo raw"]);
    expect(added.has("pomelo")).toBe(true);
  });

  it("fires on the fore-shank beef cut (raw + cooked share aliases)", () => {
    const raw = expandAliases(new Set(), ["beef chuck fore shank raw"]);
    const cooked = expandAliases(new Set(), [
      "beef chuck fore shank cooked simmered",
    ]);
    expect(raw.has("osso")).toBe(true);
    expect(raw.has("buco")).toBe(true);
    expect(cooked.has("osso")).toBe(true);
    expect(cooked.has("buco")).toBe(true);
  });

  it("returns a fresh set — does not mutate the input token set", () => {
    const tokens = new Set(["pummelo"]);
    const before = new Set(tokens);
    expandAliases(tokens, ["pummelo raw"]);
    expect([...tokens].sort()).toEqual([...before].sort());
  });
});
