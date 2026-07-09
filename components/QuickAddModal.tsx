"use client";

import { useMemo, useState } from "react";
import { MEALS, caloriesFromMacros } from "@/lib/nutrition";

// Quick Add Macros: enter fat/carbs/protein/fiber directly; calories are
// derived (4×protein + 4×net carbs + 9×fat) and the entry joins daily totals.
export default function QuickAddModal({
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
  const [meal, setMeal] = useState(initialMeal);
  const [name, setName] = useState("");
  const [form, setForm] = useState({ fat: "", carbs: "", protein: "", fiber: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const macros = useMemo(() => {
    const m = {
      fat: Number(form.fat || 0),
      carbs: Number(form.carbs || 0),
      protein: Number(form.protein || 0),
      fiber: Number(form.fiber || 0),
    };
    const valid =
      Object.values(m).every((v) => Number.isFinite(v) && v >= 0) &&
      m.fiber <= m.carbs &&
      Object.values(m).some((v) => v > 0);
    return { ...m, valid };
  }, [form]);

  const calories = caloriesFromMacros(macros);
  const netCarbs = Math.max(0, macros.carbs - macros.fiber);

  async function add() {
    if (!macros.valid) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: name.trim() ? "custom" : "quick",
        name: name.trim() || undefined,
        date,
        meal,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
        fiber: macros.fiber,
      }),
    });
    setSaving(false);
    if (res.ok) onAdded();
    else setError((await res.json()).error ?? "Failed to add");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">Quick add macros</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Calories are computed as 4×protein + 4×(carbs − fiber) + 9×fat.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              ["fat", "Fat (g)"],
              ["carbs", "Carbs, total (g)"],
              ["protein", "Protein (g)"],
              ["fiber", "Fiber (g)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs text-zinc-400">{label}</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 flex gap-3">
          <label className="block flex-1">
            <span className="mb-1 block text-xs text-zinc-400">Label (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. restaurant meal"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
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

        <div className="mt-4 rounded-lg bg-zinc-950 p-3 text-sm">
          <span className="font-semibold text-emerald-400">{Math.round(calories)} kcal</span>
          <span className="text-zinc-400"> · net carbs {Number(netCarbs.toFixed(1))} g</span>
          {macros.fiber > macros.carbs && (
            <p className="mt-1 text-xs text-red-400">Fiber can’t exceed total carbs.</p>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={add}
            disabled={!macros.valid || saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {saving ? "Adding…" : `Add to ${meal}`}
          </button>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:text-white">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
