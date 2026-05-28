import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "@/app/config/env";

// =====================================================================
// PromptOT client — fetch any prompt by id, fill its {{variables}}, and
// cache the last successful fetch (so it still works offline).
//
//   getPrompt(id, overrides) → { text, modelConfig }
//
// modelConfig is whatever the PromptOT dashboard has set for the prompt
// (model, temperature, max_tokens, top_p). aiClient uses it so the model
// is driven by PromptOT, not hardcoded in env.
//
// Resolution: network → cached copy. Throws if neither is available.
// =====================================================================

const BASE_URL = ENV.PROMPTOT_BASE_URL;

interface PromptVariable {
  key: string;
  default_value: string | null;
}

/** Model settings PromptOT stores per prompt (all optional). */
export interface PromptModelConfig {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

interface CachedPrompt {
  compiled_prompt: string;
  variables: PromptVariable[];
  model_config: PromptModelConfig;
}

export interface ResolvedPrompt {
  text: string;
  modelConfig: PromptModelConfig;
}

const cacheKey = (promptId: string) => `promptot:${promptId}`;

/** Substitute every {{key}} using overrides → default_value → "". */
function fillVariables(
  template: string,
  variables: PromptVariable[],
  overrides: Record<string, string>,
): string {
  let out = template;
  for (const v of variables) {
    out = out.replaceAll(`{{${v.key}}}`, overrides[v.key] ?? v.default_value ?? "");
  }
  return out;
}

/** Fetch a prompt from PromptOT and cache it. Returns null on any failure. */
async function fetchPrompt(promptId: string): Promise<CachedPrompt | null> {
  if (!ENV.PROMPTOT_API_KEY) return null;
  try {
    const response = await fetch(`${BASE_URL}/${promptId}`, {
      headers: { Authorization: `Bearer ${ENV.PROMPTOT_API_KEY}` },
    });
    if (!response.ok) return null;
    const { data } = await response.json();
    if (!data?.compiled_prompt) return null;

    const compiled: CachedPrompt = {
      compiled_prompt: data.compiled_prompt,
      variables: Array.isArray(data.variables) ? data.variables : [],
      model_config: (data.model_config as PromptModelConfig) ?? {},
    };
    await AsyncStorage.setItem(cacheKey(promptId), JSON.stringify(compiled));
    return compiled;
  } catch {
    return null;
  }
}

async function readCache(promptId: string): Promise<CachedPrompt | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(promptId));
    return raw ? (JSON.parse(raw) as CachedPrompt) : null;
  } catch {
    return null;
  }
}

/**
 * Final system prompt for a PromptOT prompt (variables substituted) plus
 * the model settings PromptOT has stored for it.
 */
export async function getPrompt(
  promptId: string,
  overrides: Record<string, string> = {},
): Promise<ResolvedPrompt> {
  const compiled = (await fetchPrompt(promptId)) ?? (await readCache(promptId));
  if (!compiled) {
    throw new Error(`Could not load PromptOT prompt ${promptId}.`);
  }
  return {
    text: fillVariables(compiled.compiled_prompt, compiled.variables, overrides),
    modelConfig: compiled.model_config ?? {},
  };
}
