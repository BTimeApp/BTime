import type { KPuzzle } from "cubing/kpuzzle";

import { cube3x3x3 } from "cubing/puzzles";

/**
 * Cubing.js only exposes kpuzzles through an async kpuzzle: () => Promise<KPuzzle> api.
 * Why? not sure. This loader helps deal with it by caching the definition.
 */

let kpuzzlePromise: Promise<KPuzzle> | null = null;
export function get3x3x3(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = cube3x3x3.kpuzzle();
  }
  return kpuzzlePromise;
}
