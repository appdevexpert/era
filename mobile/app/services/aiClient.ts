import { ENV } from "@/app/config/env";
import { getPrompt } from "@/app/services/promptotService";

// =====================================================================
// One place to run any PromptOT-backed AI call.
//
//   runPrompt({ promptId, variables, userMessage, parse })
//     → fetch prompt + model_config from PromptOT → call OpenAI → parse
//
// Model / temperature / max_tokens come from PromptOT's model_config so
// they can be changed from the dashboard without an app rebuild. A call
// may still pass temperature/maxTokens to override for that one call.
// ENV.OPENAI_MODEL is only a last-resort fallback.
// =====================================================================

export interface RunPromptOptions<T> {
  promptId: string;
  variables?: Record<string, string>;
  userMessage: string;
  parse: (content: string) => T;
  temperature?: number;
  maxTokens?: number;
}

/**
 * PromptOT stores the model provider-prefixed (e.g. "openai/gpt-5-nano").
 * The OpenAI API wants the bare id, so strip a leading "openai/".
 */
function normalizeModel(model: string | undefined): string {
  const raw = model ?? ENV.OPENAI_MODEL;
  return raw.startsWith("openai/") ? raw.slice("openai/".length) : raw;
}

/**
 * GPT-5 and o-series are reasoning models: they only allow the default
 * temperature (1) and top_p, and reject any custom value. So we must not
 * send those sampling params for them. gpt-4o etc. accept them fine.
 */
function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/.test(model);
}

export async function runPrompt<T>({
  promptId,
  variables,
  userMessage,
  parse,
  temperature,
  maxTokens,
}: RunPromptOptions<T>): Promise<T> {
  if (!ENV.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured.");

  const { text: systemPrompt, modelConfig } = await getPrompt(promptId, variables);
  const model = normalizeModel(modelConfig.model);

  const body: Record<string, unknown> = {
    model,
    // GPT-5 / reasoning models reject `max_tokens`; `max_completion_tokens`
    // is the modern field and works on gpt-4o models too.
    max_completion_tokens: maxTokens ?? modelConfig.max_tokens ?? 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  // Only send sampling params to models that accept them. Reasoning models
  // (gpt-5, o-series) reject custom temperature/top_p, so let them default.
  if (!isReasoningModel(model)) {
    body.temperature = temperature ?? modelConfig.temperature ?? 0.3;
    if (modelConfig.top_p !== undefined) body.top_p = modelConfig.top_p;
  }

  const response = await fetch(ENV.OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status}).`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("OpenAI returned an empty response.");

  return parse(content);
}
