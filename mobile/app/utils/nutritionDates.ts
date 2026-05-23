// =====================================================================
// Pure date helpers for the nutrition flow. All inputs/outputs use local
// time zones — match what JS Date gives natively on the device.
// Week starts Monday (matches the workout week selector).
// =====================================================================

/** Convert a Date to a 'YYYY-MM-DD' string in local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse a 'YYYY-MM-DD' (or ISO timestamp) into a Date at local midnight. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Today's date as 'YYYY-MM-DD' in local time. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Returns the Monday of the week containing `date` (1=Mon..7=Sun). */
export function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // JS getDay: 0=Sun..6=Sat. Convert to Mon=0..Sun=6 by adding 6 then mod 7.
  const dayIdx = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - dayIdx);
  return result;
}

/** Mon=1..Sun=7 for a given Date — matches `meal_program_phase_days.day_of_week`. */
export function dayOfWeek(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1;
}

/** Return [start, start+1, ..., start+6] as ISO dates. */
export function isoDatesForWeek(start: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return toIsoDate(d);
  });
}

/** Inclusive-day delta. Returns negative when `a` is before `b`. */
export function diffDays(a: string, b: string): number {
  const ms = parseIsoDate(a).getTime() - parseIsoDate(b).getTime();
  return Math.round(ms / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}
