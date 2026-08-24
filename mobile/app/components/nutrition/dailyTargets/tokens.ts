export const GOLD = "#C9A84C";
export const GOLD_DIM = "rgba(201, 168, 76, 0.18)";

// Over-target palette (Figma 7535:4634). The gauge, the kcal number and any
// macro that has passed its target flip from gold to salmon. Sampled off the
// mock: the semicircle goes flat salmon, the macro rings keep a gradient.
export const OVER = "#E67777";

// Macro ring gradients run top → bottom — deep tone at the top of the ring,
// cream at the bottom (Figma 7535:4316 / 7535:4634).
export const GOLD_RING_TOP = GOLD;
export const GOLD_RING_BOTTOM = "#FCF3C0";
export const OVER_RING_TOP = OVER;
export const OVER_RING_BOTTOM = "#FBF0BE";

/**
 * Strict over-target test — shared so the gauge, the number and the caption
 * can never disagree. No grace band: one unit past the target counts as over.
 */
export const isOverTarget = (eaten: number, total: number): boolean =>
  total > 0 && eaten > total;

export const SEMICIRCLE_GAUGE_SIZE = 220;
export const SEMICIRCLE_VIEWBOX_W = 206;
export const SEMICIRCLE_VIEWBOX_H = 110;
export const SEMICIRCLE_RENDER_HEIGHT =
  (SEMICIRCLE_GAUGE_SIZE * SEMICIRCLE_VIEWBOX_H) / SEMICIRCLE_VIEWBOX_W;

export const MACRO_GAUGE_VIEWBOX_W = 59;
export const MACRO_GAUGE_VIEWBOX_H = 56;
export const MACRO_GAUGE_WIDTH = 60;
export const MACRO_GAUGE_HEIGHT =
  (MACRO_GAUGE_WIDTH * MACRO_GAUGE_VIEWBOX_H) / MACRO_GAUGE_VIEWBOX_W;
export const MACRO_DIM_STROKE = 5;
export const MACRO_BRIGHT_STROKE = 6;

// Shared minimum height so the macros and water cards stay aligned when paging.
// Sized for the macros card with its "Target …kCal" header row on top.
export const CARD_MIN_HEIGHT = 325;
