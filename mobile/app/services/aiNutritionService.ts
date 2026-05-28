import i18n from "@/app/locales/i18n";
import { PROMPT_IDS } from "@/app/config/promptIds";
import { runPrompt } from "@/app/services/aiClient";
import { parseJsonContent, round1, toNumber } from "@/app/utils/aiJson";
import type { MealCategoryEnum } from "@/app/types/nutrition";

// =====================================================================
// AI meal-log estimator (PromptOT: "ERA Nutrition Meal Estimator").
// Given a structured meal description, estimate kcal + macros with a
// localized name for insertion into meal_logs.
// =====================================================================

export interface MealItemInput {
  name: string;
  /** Serving value as a string (e.g. "2", "150"). May be empty. */
  servingSize: string;
  /** Serving units (e.g. "piece", "g"). May be empty. */
  units: string;
}

export interface AnalyzeMealInput {
  items: MealItemInput[];
  comments: string;
  category: MealCategoryEnum;
}

export interface AnalyzedMealItem {
  name: string;
  quantity: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}

export interface AnalyzedMeal {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  confidence: "high" | "medium" | "low";
  items: AnalyzedMealItem[];
}

/** Estimate kcal + macros for a manually described meal. */
export async function analyzeMealText(
  input: AnalyzeMealInput,
): Promise<AnalyzedMeal> {
  return runPrompt<AnalyzedMeal>({
    promptId: PROMPT_IDS.mealEstimator,
    variables: {
      output_language: i18n.language === "nb" ? "Norwegian Bokmål" : "English",
    },
    userMessage: buildUserMessage(input),
    parse: (content) => validateAnalyzedMeal(parseJsonContent(content)),
    // temperature + max_tokens come from PromptOT's model_config.
  });
}

// -------- helpers ----------------------------------------------------

function buildUserMessage(input: AnalyzeMealInput): string {
  const lines: string[] = [];
  if (input.items.length === 0) {
    lines.push("Meal: (no description provided)");
  } else {
    lines.push("Meal items:");
    for (const item of input.items) {
      const portion = [item.servingSize, item.units].filter(Boolean).join(" ").trim();
      const label = portion ? `${item.name} (${portion})` : item.name;
      lines.push(`- ${label}`);
    }
  }
  if (input.comments.trim()) {
    lines.push(`Notes: ${input.comments.trim()}`);
  }
  lines.push(`Selected category: ${input.category}`);
  return lines.join("\n");
}

function validateAnalyzedMeal(raw: unknown): AnalyzedMeal {
  if (!raw || typeof raw !== "object") {
    throw new Error("AI response was not a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.slice(0, 60) : "";
  const kcal = toNumber(obj.kcal);
  const protein_g = toNumber(obj.protein_g);
  const carbs_g = toNumber(obj.carbs_g);
  const fats_g = toNumber(obj.fats_g);

  if (!name || kcal < 0 || protein_g < 0 || carbs_g < 0 || fats_g < 0) {
    throw new Error("AI response was missing or had invalid macro fields.");
  }

  const confidence: AnalyzedMeal["confidence"] =
    obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
      ? obj.confidence
      : "medium";

  const items = Array.isArray(obj.items)
    ? obj.items.map(toItem).filter((it): it is AnalyzedMealItem => it !== null)
    : [];

  return {
    name,
    kcal: Math.round(kcal),
    protein_g: round1(protein_g),
    carbs_g: round1(carbs_g),
    fats_g: round1(fats_g),
    confidence,
    items,
  };
}

function toItem(raw: unknown): AnalyzedMealItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name : "";
  if (!name) return null;
  return {
    name,
    quantity: typeof obj.quantity === "string" ? obj.quantity : "",
    kcal: Math.round(toNumber(obj.kcal)),
    protein_g: round1(toNumber(obj.protein_g)),
    carbs_g: round1(toNumber(obj.carbs_g)),
    fats_g: round1(toNumber(obj.fats_g)),
  };
}
