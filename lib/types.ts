// Shapes returned by the API routes, shared by client components.

export type PortionDto = { unit: string; gramWeight: number };

export type FoodDto = {
  id: number;
  name: string;
  category: string;
  state: string;
  isCustom: boolean;
  sourceCount: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
  portions: PortionDto[];
};

export type LogEntryDto = {
  id: number;
  date: string;
  meal: string;
  kind: "food" | "quick" | "custom";
  foodId: number | null;
  name: string;
  unit: string | null;
  amount: number | null;
  grams: number | null;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calories: number;
};

export type PlanDto = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};
