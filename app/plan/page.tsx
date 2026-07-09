"use client";

import { useEffect, useState } from "react";
import { caloriesFromMacros } from "@/lib/nutrition";
import type { PlanDto } from "@/lib/types";

const DEFAULTS: PlanDto = { calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 28 };

const ACTIVITY = [
  { label: "Sedentary (desk job, little exercise)", factor: 1.2 },
  { label: "Light (1-3 workouts/week)", factor: 1.375 },
  { label: "Moderate (3-5 workouts/week)", factor: 1.55 },
  { label: "Very active (6-7 workouts/week)", factor: 1.725 },
  { label: "Athlete (2x training/day)", factor: 1.9 },
];

const GOALS = [
  { label: "Cut (-20%)", factor: 0.8 },
  { label: "Maintain", factor: 1 },
  { label: "Lean bulk (+10%)", factor: 1.1 },
];

type PlanField = keyof PlanDto;
const FIELDS: { key: PlanField; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs (total)", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
];

export default function PlanPage() {
  const [form, setForm] = useState<Record<PlanField, string>>({
    calories: "", protein: "", carbs: "", fat: "", fiber: "",
  });
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "saved" | "error">("loading");

  // TDEE calculator state
  const [showTdee, setShowTdee] = useState(false);
  const [tdee, setTdee] = useState({ sex: "male", age: "28", heightCm: "178", weightKg: "80", activity: "2", goal: "1" });

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((plan: PlanDto | null) => {
        const p = plan ?? DEFAULTS;
        setForm({
          calories: String(p.calories), protein: String(p.protein),
          carbs: String(p.carbs), fat: String(p.fat), fiber: String(p.fiber),
        });
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const nums = Object.fromEntries(
    FIELDS.map(({ key }) => [key, Number(form[key])]),
  ) as Record<PlanField, number>;
  const valid = FIELDS.every(({ key }) => Number.isFinite(nums[key]) && nums[key] >= 0)
    && nums.fiber <= nums.carbs;

  // Calories implied by the macro targets, using the net-carb convention.
  const impliedCalories = valid ? Math.round(caloriesFromMacros(nums)) : null;
  const drift = impliedCalories !== null && nums.calories > 0
    ? impliedCalories - nums.calories
    : null;

  async function save() {
    if (!valid) return;
    setStatus("saving");
    const res = await fetch("/api/plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nums),
    });
    setStatus(res.ok ? "saved" : "error");
  }

  function suggestFromTdee() {
    const w = Number(tdee.weightKg), h = Number(tdee.heightCm), a = Number(tdee.age);
    if (!(w > 0 && h > 0 && a > 0)) return;
    // Mifflin-St Jeor BMR, scaled by activity and goal.
    const bmr = 10 * w + 6.25 * h - 5 * a + (tdee.sex === "male" ? 5 : -161);
    const calories = Math.round(bmr * ACTIVITY[Number(tdee.activity)].factor * GOALS[Number(tdee.goal)].factor);
    const protein = Math.round(w * 2); // 2 g/kg — bodybuilding-appropriate
    const fat = Math.round((calories * 0.25) / 9);
    const fiber = Math.round((14 * calories) / 1000); // 14 g per 1000 kcal
    // Remaining calories go to net carbs; total carbs = net + fiber.
    const netCarbGrams = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
    setForm({
      calories: String(calories), protein: String(protein),
      carbs: String(netCarbGrams + fiber), fat: String(fat), fiber: String(fiber),
    });
  }

  if (status === "loading") return <p className="text-zinc-400">Loading plan…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Nutrition Plan</h1>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {FIELDS.map(({ key, label, unit }) => (
            <label key={key} className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-400">
                {label} ({unit})
              </span>
              <input
                type="number"
                min="0"
                value={form[key]}
                onChange={(e) => {
                  setForm({ ...form, [key]: e.target.value });
                  if (status === "saved") setStatus("ready");
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 space-y-1 text-sm">
          {nums.fiber > nums.carbs && (
            <p className="text-red-400">Fiber can’t exceed total carbs.</p>
          )}
          {drift !== null && (
            <p className={Math.abs(drift) > 50 ? "text-amber-400" : "text-zinc-400"}>
              Your macros imply <strong>{impliedCalories} kcal</strong> (4×protein +
              4×net carbs + 9×fat){" "}
              {Math.abs(drift) > 50
                ? `— ${Math.abs(drift)} kcal ${drift > 0 ? "above" : "below"} your calorie target.`
                : "— consistent with your calorie target."}
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={!valid || status === "saving"}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {status === "saving" ? "Saving…" : "Save plan"}
          </button>
          {status === "saved" && <span className="text-sm text-emerald-400">Saved.</span>}
          {status === "error" && <span className="text-sm text-red-400">Save failed.</span>}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <button
          onClick={() => setShowTdee(!showTdee)}
          className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
        >
          {showTdee ? "▾" : "▸"} Suggest targets from TDEE
        </button>

        {showTdee && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Sex</span>
                <select
                  value={tdee.sex}
                  onChange={(e) => setTdee({ ...tdee, sex: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
              {(
                [
                  ["age", "Age"],
                  ["heightCm", "Height (cm)"],
                  ["weightKg", "Weight (kg)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-zinc-400">{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={tdee[key]}
                    onChange={(e) => setTdee({ ...tdee, [key]: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Activity</span>
                <select
                  value={tdee.activity}
                  onChange={(e) => setTdee({ ...tdee, activity: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  {ACTIVITY.map((a, i) => (
                    <option key={a.label} value={i}>{a.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-400">Goal</span>
                <select
                  value={tdee.goal}
                  onChange={(e) => setTdee({ ...tdee, goal: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  {GOALS.map((g, i) => (
                    <option key={g.label} value={i}>{g.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              onClick={suggestFromTdee}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-600/10"
            >
              Fill targets
            </button>
            <p className="text-xs text-zinc-500">
              Mifflin-St Jeor BMR × activity × goal. Protein 2 g/kg, fat 25% of
              calories, fiber 14 g/1000 kcal, remaining calories as net carbs.
              Review before saving.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
