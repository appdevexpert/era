export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  SUPABASE_EDGE_FUNCTION_URL: process.env.EXPO_PUBLIC_SUPABASE_EDGE_FUNCTION_URL ?? "",
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
  OPENAI_MODEL: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4o-mini",
  // SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? " ",
};

export const validateEnv = () => {
  const missing = Object.entries(ENV).filter(([, v]) => !v);
  if (missing.length) {
    console.warn("[ENV] Missing:", missing.map(([k]) => k).join(", "));
  }
};
