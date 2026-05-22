export type MealCategory = "breakfast" | "lunch" | "eveningSnack" | "dinner";

export interface MealRow {
  id: string;
  category: MealCategory;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}
