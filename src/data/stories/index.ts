// ─── Story Database Index ────────────────────────────────────────────────────
// Central export point for all story datasets.
// Import from here rather than directly from individual category files.

export { fableStories } from "./fable";
export { mythStories } from "./myth";
export { legendStories } from "./legend";
export { realisticFictionStories } from "./realistic_fiction";
export { grade5Stories } from "./grade5";
export { grade6Stories } from "./grade6";

import { fableStories } from "./fable";
import { mythStories } from "./myth";
import { legendStories } from "./legend";
import { realisticFictionStories } from "./realistic_fiction";
import { grade5Stories } from "./grade5";
import { grade6Stories } from "./grade6";
import type { StoryData as Story } from "../../types";

/**
 * All stories from every category combined into a single array.
 * Useful for global search, stats, and future filtering features.
 */
export const allStories: Story[] = [
  ...fableStories,
  ...mythStories,
  ...legendStories,
  ...realisticFictionStories,
  ...grade5Stories,
  ...grade6Stories,
];
