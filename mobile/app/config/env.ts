export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  SUPABASE_EDGE_FUNCTION_URL: process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL ?? "",
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
  OPENAI_MODEL: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "",
  OPENAI_URL: process.env.EXPO_PUBLIC_OPENAI_URL ?? "",
  PROMPTOT_API_KEY: process.env.EXPO_PUBLIC_PROMPTOT_API_KEY ?? "",
  PROMPTOT_BASE_URL: process.env.EXPO_PUBLIC_PROMPTOT_BASE_URL ?? "",
  // SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? " ",
};

export const validateEnv = () => {
  const missing = Object.entries(ENV).filter(([, v]) => !v);
  if (missing.length) {
    console.warn("[ENV] Missing:", missing.map(([k]) => k).join(", "));
  }
};
