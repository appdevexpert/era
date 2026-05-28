import { ComponentType } from "react";
import { SvgProps } from "react-native-svg";

export type MealCategory =
  | "breakfast"
  | "lunch"
  | "snack"
  | "eveningSnack"
  | "dinner"
  | "preWorkout"
  | "postWorkout"
  | "cheatMeal";

/**
 * Where the row comes from — drives the eyebrow tag.
 *   - "plan"   → "{Category} • As per plan"
 *   - "custom" → "{Category} • Custom added"
 * Only meaningful when `added` is true.
 */
export type MealSource = "plan" | "custom";

export interface MealRow {
  id: string;
  category: MealCategory;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  /** Optional note/description shown under the macros (e.g. a custom meal comment). */
  note?: string;
  /** True when the user has logged this meal for today. */
  added?: boolean;
  /** Origin of the row when added; ignored otherwise. */
  source?: MealSource;
  /** SVG component rendered inside the icon box (passed by the parent). */
  Icon: ComponentType<SvgProps>;
  /**
   * Overrides the default icon tint. When omitted, the card uses gold for
   * "added" rows and a dim gray for "not added" rows.
   */
  iconColor?: string;
}
