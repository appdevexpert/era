import { ENV } from "@/app/config/env";
import type { MealCategoryEnum } from "@/app/types/nutrition";

// =====================================================================
// AI meal-log estimator.
//
// Given a structured meal description (name + serving + units + optional
// notes + chosen category), call OpenAI's chat completion API in
// JSON-mode and return kcal/protein/carbs/fats suitable for inserting
// into meal_logs.
//
// The system prompt is hard-coded in this file on purpose — we don't
// want a runtime PromptOT dependency for a single, well-scoped flow.
// =====================================================================

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are a precise sports-nutrition analyst for the ERA fitness app.

Given a short meal description, estimate realistic kcal and macros and return a single JSON object — no prose, no markdown fences.

Rules:
- Parse the description into individual food items, each with a quantity (count, weight, or volume).
- Estimate per-item kcal, protein_g, carbs_g, fats_g using USDA-equivalent reference values.
- Round each macro to one decimal place; round kcal to a whole number.
- Sum the items into meal totals — totals MUST equal the sum of items within ±2 kcal / ±0.5 g of macros.
- Each item's macros must be self-consistent: kcal ≈ 4·protein_g + 4·carbs_g + 9·fats_g (±15 kcal slack).
- Never invent ingredients the user didn't describe. If quantity is missing, assume a typical single serving and note it in items[].quantity.
- Do not refuse — always produce a JSON estimate, even for unfamiliar foods.

Output shape (return EXACTLY this JSON, no extra keys):
{
  "name": "<short title-case label, ≤ 60 chars>",
  "kcal": <positive integer>,
  "protein_g": <non-negative number, 1 decimal>,
  "carbs_g": <non-negative number, 1 decimal>,
  "fats_g": <non-negative number, 1 decimal>,
  "confidence": "high" | "medium" | "low",
  "items": [
    {
      "name": "<item name>",
      "quantity": "<e.g. '2', '150g', '1 slice'>",
      "kcal": <integer>,
      "protein_g": <number>,
      "carbs_g": <number>,
      "fats_g": <number>
    }
  ]
}`;

export interface MealItemInput {
  name: string;
  /** Serving value as a string (e.g. "2", "150"). May be empty. */
  servingSize: string;
  /** Serving units (e.g. "piece", "g"). May be empty. */
  units: string;
}

export interface AnalyzeMealInput {
  /** One or more food items the user staged in the log sheet. */
  items: MealItemInput[];
  /** Optional free-text comments / extra context. */
  comments: string;
  /** Category selected in the UI. Sent for context only — not changed by the AI. */
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

/**
 * Call OpenAI to estimate kcal + macros for a manually-entered meal.
 * Throws if the API key is missing, the request fails, or the JSON
 * response is malformed.
 */
export async function analyzeMealText(
  input: AnalyzeMealInput,
): Promise<AnalyzedMeal> {
  const apiKey = ENV.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const userMessage = buildUserMessage(input);

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ENV.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await safeReadText(response);
    throw new Error(
      `OpenAI request failed (${response.status}): ${errBody.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  const parsed = parseJsonContent(content);
  return validateAnalyzedMeal(parsed);
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

function parseJsonContent(content: string): unknown {
  // The API is in JSON mode, so content should already be a JSON object —
  // but defend against the occasional fenced block.
  const trimmed = content.trim();
  const stripped = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(stripped);
  } catch (error) {
    throw new Error(
      `Could not parse AI response as JSON: ${(error as Error).message}`,
    );
  }
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

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
}
