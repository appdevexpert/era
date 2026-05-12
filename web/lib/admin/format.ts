import type { TranslationMap } from "@/lib/admin/types";

export function translation(
  value: TranslationMap | null | undefined,
  locale: "en" | "nb",
  fallback: string | null | undefined = "",
) {
  return value?.[locale] || value?.en || value?.nb || fallback || "";
}

export function listText(values: string[] | null | undefined, fallback = "None") {
  return values?.length ? values.join(", ") : fallback;
}

export function dateText(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function numberText(value: number | null | undefined, fallback = "0") {
  if (typeof value !== "number") return fallback;
  return new Intl.NumberFormat("en").format(value);
}
