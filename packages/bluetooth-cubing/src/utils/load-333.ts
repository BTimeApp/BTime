import type { KPuzzle } from "cubing/kpuzzle";

import { cube3x3x3 } from "cubing/puzzles";

let kpuzzlePromise: Promise<KPuzzle> | null = null;

export function get3x3KPuzzle(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = cube3x3x3.kpuzzle();
  }
  return kpuzzlePromise;
}
