"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MEALS, scaleMacros, toGrams, MASS_UNITS, type Unit } from "@/lib/nutrition";
import type { FoodDto } from "@/lib/types";

const UNIT_ORDER: Unit[] = ["g", "oz", "lb", "tsp", "tbsp", "cup"];

function fmt(n: number, digits = 1) {
  return Number(n.toFixed(digits)).toString();
}

export default function FoodSearchModal({
  date,
  meal: initialMeal,
  onClose,
  onAdded,
}: {
  date: string;
  meal: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodDto[]>([]);
  const [recents, setRecents] = useState<FoodDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FoodDto | null>(null);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<Unit>("g");
  const [meal, setMeal] = useState(initialMeal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: "", per: "100g", servingGrams: "", protein: "", carbs: "", fat: "", fiber: "",
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch("/api/foods/recent").then((r) => r.json()).then(setRecents).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/foods/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((foods: FoodDto[]) => setResults(foods))
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const availableUnits: Unit[] = useMemo(() => {
    if (!selected) return ["g"];
    const volume = new Set(selected.portions.map((p) => p.unit));
    return UNIT_ORDER.filter((u) => u in MASS_UNITS || volume.has(u));
  }, [selected]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const n = Number(amount);
    if (!(n > 0)) return null;
    const portion = selected.portions.find((p) => p.unit === unit);
    try {
      const grams = toGrams(n, unit, portion?.gramWeight);
      return { grams, ...scaleMacros(selected, grams) };
    } catch {
      return null;
    }
  }, [selected, amount, unit]);

  function pick(food: FoodDto) {
    setSelected(food);
    setUnit("g");
    setAmount("100");
    setError("");
    setCreating(false);
  }

  async function createCustomFood() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customForm.name,
        per: customForm.per,
        servingGrams: customForm.per === "serving" ? Number(customForm.servingGrams) : undefined,
        protein: Number(customForm.protein || 0),
        carbs: Number(customForm.carbs || 0),
        fat: Number(customForm.fat || 0),
        fiber: Number(customForm.fiber || 0),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const food: FoodDto = await res.json();
      setRecents((r) => [food, ...r]);
      pick(food); // straight to the amount picker so it can be logged now
    } else {
      setError((await res.json()).error ?? "Failed to save food");
    }
  }

  async function deleteCustomFood(food: FoodDto) {
    if (!confirm(`Delete "${food.name}"? Past diary entries keep their values.`)) return;
    const res = await fetch(`/api/foods/${food.id}`, { method: "DELETE" });
    if (res.ok) {
      setSelected(null);
      setResults((r) => r.filter((f) => f.id !== food.id));
      setRecents((r) => r.filter((f) => f.id !== food.id));
    }
  }

  async function add() {
    if (!selected || !preview) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "food", date, meal, foodId: selected.id, unit, amount: Number(amount) }),
    });
    setSaving(false);
    if (res.ok) onAdded();
    else setError((await res.json()).error ?? "Failed to add");
  }

  const list = query.trim().length >= 2 ? results : recents;
  const listLabel = query.trim().length >= 2
    ? searching ? "Searching…" : `${results.length} results`
    : recents.length > 0 ? "Recent foods" : "Type to search 12,000+ foods";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 p-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search foods, e.g. "cooked sirloin steak"'
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {creating ? (
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold">Create custom food</h3>
              <button onClick={() => { setCreating(false); setError(""); }} className="text-xs text-zinc-400 hover:text-white">
                ← back
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-400">Name</span>
              <input
                value={customForm.name}
                onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                placeholder="e.g. Mum's protein oats"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Macros entered per</span>
                <select
                  value={customForm.per}
                  onChange={(e) => setCustomForm({ ...customForm, per: e.target.value })}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="100g">100 g</option>
                  <option value="serving">one serving</option>
                </select>
              </label>
              {customForm.per === "serving" && (
                <label className="block">
                  <span className="mb-1 block text-xs text-zinc-400">Serving weight (g)</span>
                  <input
                    type="number" min="0" step="any"
                    value={customForm.servingGrams}
                    onChange={(e) => setCustomForm({ ...customForm, servingGrams: e.target.value })}
                    className="w-28 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [["protein", "Protein (g)"], ["carbs", "Carbs (g)"], ["fat", "Fat (g)"], ["fiber", "Fiber (g)"]] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-zinc-400">{label}</span>
                  <input
                    type="number" min="0" step="any"
                    value={customForm[key]}
                    onChange={(e) => setCustomForm({ ...customForm, [key]: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              onClick={createCustomFood}
              disabled={saving || !customForm.name.trim() || (customForm.per === "serving" && !(Number(customForm.servingGrams) > 0))}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save food"}
            </button>
            <p className="text-xs text-zinc-500">
              Saved foods show up in search and recents, and can be logged in any unit like other foods.
            </p>
          </div>
        ) : !selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-xs text-zinc-500">{listLabel}</p>
              <button
                onClick={() => { setCreating(true); setError(""); }}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                + Create custom food
              </button>
            </div>
            {list.map((f) => (
              <button
                key={f.id}
                onClick={() => pick(f)}
                className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-800"
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                  {f.state !== "other" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        f.state === "cooked" ? "bg-orange-500/15 text-orange-300" : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {f.state}
                    </span>
                  )}
                  {f.sourceCount > 1 && (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                      avg of {f.sourceCount}
                    </span>
                  )}
                  {f.isCustom && (
                    <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                      custom
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  per 100 g: {Math.round(f.calories)} kcal · P {fmt(f.protein)} · C {fmt(f.carbs)} · F{" "}
                  {fmt(f.fat)} · fiber {fmt(f.fiber)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{selected.name}</p>
                <p className="text-xs text-zinc-500">
                  {selected.category}
                  {selected.sourceCount > 1 && ` · averaged from ${selected.sourceCount} database entries`}
                  {selected.isCustom && " · your saved food"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {selected.isCustom && (
                  <button onClick={() => deleteCustomFood(selected)} className="text-xs text-zinc-500 hover:text-red-400">
                    delete food
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-xs text-zinc-400 hover:text-white">
                  ← back
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Unit</span>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as Unit)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Meal</span>
                <select
                  value={meal}
                  onChange={(e) => setMeal(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm capitalize"
                >
                  {MEALS.map((m) => (
                    <option key={m} value={m} className="capitalize">{m}</option>
                  ))}
                </select>
              </label>
            </div>

            {preview ? (
              <div className="rounded-lg bg-zinc-950 p-3 text-sm">
                <span className="font-semibold text-emerald-400">{Math.round(preview.calories)} kcal</span>
                <span className="text-zinc-400">
                  {" "}· {fmt(preview.grams, 0)} g · P {fmt(preview.protein)} · C {fmt(preview.carbs)} (net{" "}
                  {fmt(Math.max(0, preview.carbs - preview.fiber))}) · F {fmt(preview.fat)} · fiber {fmt(preview.fiber)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Enter a valid amount.</p>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              onClick={add}
              disabled={!preview || saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {saving ? "Adding…" : `Add to ${meal}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
