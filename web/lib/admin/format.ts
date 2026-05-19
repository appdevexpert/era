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

export function relativeTimeText(value: string | null | undefined): string {
  if (!value) return "Never";
  const then = new Date(value).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
