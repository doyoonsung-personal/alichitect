// Grid rules for fallback glyphs, measured from the 284 official icons on their 1024 grid (2026-10-31):
//   larger side: 10th percentile 810, median 853, 75th 938;
//   nearest edge: median 85 units in from the grid edge; farthest edge: median 939.
// Fallbacks therefore span at least 800 units on their larger side and stay inside 64..960, and the fit tool's
// default target is 860. Stroke weight, measured as average stroke width at 128 px, has an official median of
// 9.9 px (middle half 7.8-12.5); fallbacks are drawn with 80-unit strokes, about 10 px at that size.
export const LIVE_AREA = { min: 64, max: 960 } as const;
export const MIN_EXTENT = 800;
export const FIT_EXTENT = 860;
