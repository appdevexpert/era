/**
 * Thousands grouping without Intl.
 *
 * Hermes ships `toLocaleString` but ignores the locale argument on some
 * builds, so the separator is picked explicitly: Norwegian groups with a
 * non-breaking space (1 800), English with a comma (1,800).
 */
export const groupThousands = (value: number, language: string): string => {
  const separator = language.startsWith("nb") ? "\u00A0" : ",";
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};
