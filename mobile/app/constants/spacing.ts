/**
 * Canonical spacing scale.
 *
 * Use these instead of hand-typed numbers for `margin`, `padding`, `gap`,
 * etc. so screens stay visually consistent. Keep the scale small — adding
 * a new step is a design decision, not a one-off override.
 */
export const SPACING = {
  /** 4 — hairline gap inside chips/badges */
  xxs: 4,
  /** 8 — tight stack inside cards */
  xs: 8,
  /** 12 — default gap between rows */
  sm: 12,
  /** 16 — card padding, screen horizontal gutter (compact) */
  md: 16,
  /** 20 — screen horizontal gutter (default) */
  lg: 20,
  /** 24 — section padding, screen content padding */
  xl: 24,
  /** 32 — between major sections */
  xxl: 32,
  /** 40 — large header/hero spacing */
  xxxl: 40,
} as const;

/**
 * Standard border radii. Matching the visual language: rounded cards (16),
 * pill buttons (28+), full circles (999).
 */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 28,
  full: 999,
} as const;

export type SpacingKey = keyof typeof SPACING;
export type RadiusKey = keyof typeof RADIUS;
