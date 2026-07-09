"use client";

import { useCallback, useEffect, useState } from "react";
import FoodSearchModal from "@/components/FoodSearchModal";
import QuickAddModal from "@/components/QuickAddModal";
import { MEALS, netCarbs } from "@/lib/nutrition";
import type { LogEntryDto, PlanDto } from "@/lib/types";

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localDateStr(dt);
}

function fmt(n: number, digits = 1) {
  return Number(n.toFixed(digits)).toString();
}

const BAR_COLORS: Record<string, string> = {
  calories: "bg-emerald-500",
  protein: "bg-sky-500",
  carbs: "bg-violet-500",
  fat: "bg-amber-500",
  fiber: "bg-teal-500",
};

type Modal = { type: "search" | "quick"; meal: string } | null;

export default function DiaryPage() {
  const [date, setDate] = useState(() => localDateStr(new Date()));
  const [entries, setEntries] = useState<LogEntryDto[]>([]);
  const [plan, setPlan] = useState<PlanDto | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    fetch(`/api/log?date=${date}`).then((r) => r.json()).then(setEntries).catch(() => {});
  }, [date]);

  useEffect(refresh, [refresh]);
  useEffect(() => {
    fetch("/api/plan").then((r) => r.json()).then(setPlan).catch(() => {});
  }, []);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
      fiber: acc.fiber + e.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const isToday = date === localDateStr(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setDate(shiftDate(date, -1))} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-sm hover:bg-zinc-800" aria-label="Previous day">←</button>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
          />
          <button onClick={() => setDate(shiftDate(date, 1))} className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-sm hover:bg-zinc-800" aria-label="Next day">→</button>
          {!isToday && (
            <button onClick={() => setDate(localDateStr(new Date()))} className="text-xs text-emerald-400 hover:text-emerald-300">
              Today
            </button>
          )}
        </div>
        <button
          onClick={() => setModal({ type: "quick", meal: "snacks" })}
          className="rounded-lg border border-emerald-600 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-600/10"
        >
          + Quick add macros
        </button>
      </div>

      <Dashboard totals={totals} plan={plan} />

      {MEALS.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          entries={entries.filter((e) => e.meal === meal)}
          onAddFood={() => setModal({ type: "search", meal })}
          onQuickAdd={() => setModal({ type: "quick", meal })}
          editingId={editingId}
          setEditingId={setEditingId}
          refresh={refresh}
        />
      ))}

      {modal?.type === "search" && (
        <FoodSearchModal
          date={date}
          meal={modal.meal}
          onClose={() => setModal(null)}
          onAdded={() => { setModal(null); refresh(); }}
        />
      )}
      {modal?.type === "quick" && (
        <QuickAddModal
          date={date}
          meal={modal.meal}
          onClose={() => setModal(null)}
          onAdded={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

function Dashboard({ totals, plan }: { totals: Record<string, number>; plan: PlanDto | null }) {
  const rows: { key: keyof PlanDto; label: string; value: number; suffix?: string }[] = [
    { key: "calories", label: "Calories", value: totals.calories },
    { key: "protein", label: "Protein", value: totals.protein, suffix: "g" },
    { key: "carbs", label: "Carbs", value: totals.carbs, suffix: "g" },
    { key: "fat", label: "Fat", value: totals.fat, suffix: "g" },
    { key: "fiber", label: "Fiber", value: totals.fiber, suffix: "g" },
  ];
  const net = netCarbs({ carbs: totals.carbs, fiber: totals.fiber });

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      {!plan && (
        <p className="mb-3 text-sm text-amber-400">
          No plan set yet — <a href="/plan" className="underline">set your targets</a> to see remaining amounts.
        </p>
      )}
      <div className="space-y-3">
        {rows.map(({ key, label, value, suffix }) => {
          const target = plan?.[key] ?? null;
          const pct = target ? Math.min(100, (value / target) * 100) : 0;
          const over = target !== null && value > target;
          const digits = key === "calories" ? 0 : 1;
          return (
            <div key={key}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-medium">
                  {label}
                  {key === "carbs" && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">net {fmt(net)} g</span>
                  )}
                </span>
                <span className={over ? "text-red-400" : "text-zinc-400"}>
                  {fmt(value, digits)}
                  {target !== null && ` / ${fmt(target, 0)}`} {suffix ?? "kcal"}
                  {target !== null && !over && (
                    <span className="ml-2 text-xs text-zinc-500">{fmt(target - value, digits)} left</span>
                  )}
                  {over && <span className="ml-2 text-xs">over</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : BAR_COLORS[key]}`}
                  style={{ width: target ? `${pct}%` : "0%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MealSection({
  meal,
  entries,
  onAddFood,
  onQuickAdd,
  editingId,
  setEditingId,
  refresh,
}: {
  meal: string;
  entries: LogEntryDto[];
  onAddFood: () => void;
  onQuickAdd: () => void;
  editingId: number | null;
  setEditingId: (id: number | null) => void;
  refresh: () => void;
}) {
  const subtotal = entries.reduce((s, e) => s + e.calories, 0);

  async function remove(id: number) {
    await fetch(`/api/log/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold capitalize">{meal}</h2>
        <div className="flex items-center gap-3">
          {subtotal > 0 && <span className="text-xs text-zinc-500">{Math.round(subtotal)} kcal</span>}
          <button onClick={onQuickAdd} className="text-xs text-zinc-400 hover:text-white">+ macros</button>
          <button onClick={onAddFood} className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
            + Add food
          </button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-3 text-sm text-zinc-600">Nothing logged.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-2.5">
              {editingId === e.id ? (
                <EntryEditor entry={e} onDone={() => { setEditingId(null); refresh(); }} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{e.name}</p>
                    <p className="text-xs text-zinc-500">
                      {e.kind === "food" && e.amount !== null
                        ? `${fmt(e.amount)} ${e.unit}${e.grams !== null && e.unit !== "g" ? ` (${fmt(e.grams, 0)} g)` : ""} · `
                        : ""}
                      {Math.round(e.calories)} kcal · P {fmt(e.protein)} · C {fmt(e.carbs)} · F {fmt(e.fat)} · fib{" "}
                      {fmt(e.fiber)}
                    </p>
                  </div>
                  <button onClick={() => setEditingId(e.id)} className="text-xs text-zinc-500 hover:text-white">
                    edit
                  </button>
                  <button onClick={() => remove(e.id)} className="text-xs text-zinc-500 hover:text-red-400">
                    delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryEditor({
  entry,
  onDone,
  onCancel,
}: {
  entry: LogEntryDto;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isFood = entry.kind === "food";
  const [meal, setMeal] = useState(entry.meal);
  const [amount, setAmount] = useState(String(entry.amount ?? ""));
  const [macros, setMacros] = useState({
    protein: String(entry.protein), carbs: String(entry.carbs),
    fat: String(entry.fat), fiber: String(entry.fiber),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    const body = isFood
      ? { meal, amount: Number(amount) }
      : { meal, protein: Number(macros.protein), carbs: Number(macros.carbs), fat: Number(macros.fat), fiber: Number(macros.fiber) };
    const res = await fetch(`/api/log/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onDone();
    else setError((await res.json()).error ?? "Failed to save");
  }

  const inputCls = "w-20 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-2">
      <p className="truncate text-sm">{entry.name}</p>
      <div className="flex flex-wrap items-center gap-2">
        {isFood ? (
          <label className="flex items-center gap-1 text-xs text-zinc-400">
            {entry.unit}:
            <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </label>
        ) : (
          (["protein", "carbs", "fat", "fiber"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1 text-xs text-zinc-400">
              {k[0].toUpperCase()}:
              <input type="number" min="0" step="any" value={macros[k]} onChange={(e) => setMacros({ ...macros, [k]: e.target.value })} className={inputCls} />
            </label>
          ))
        )}
        <select value={meal} onChange={(e) => setMeal(e.target.value)} className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs capitalize">
          {MEALS.map((m) => (
            <option key={m} value={m} className="capitalize">{m}</option>
          ))}
        </select>
        <button onClick={save} disabled={saving} className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40">
          {saving ? "…" : "Save"}
        </button>
        <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-white">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
