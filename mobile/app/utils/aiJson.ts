// =====================================================================
// Shared helpers for parsing AI (OpenAI JSON-mode) responses. Used by
// the AI services so the fence-stripping / coercion logic lives once.
// =====================================================================

/** Strip optional markdown fences and JSON.parse the model's content. */
export function parseJsonContent(content: string): unknown {
  const stripped = content
    .trim()
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

/** Coerce an unknown value to a finite number, else 0. */
export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Round to one decimal place. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
