import type { KPuzzle } from "cubing/kpuzzle";

import { cube3x3x3 } from "cubing/puzzles";

// cache the kpuzzle on browser like is done in virtual-cubing-react
let kpuzzle333Promise: Promise<KPuzzle>;
export function get3x3x3(): Promise<KPuzzle> {
  if (!kpuzzle333Promise) {
    kpuzzle333Promise = cube3x3x3.kpuzzle();
  }
  return kpuzzle333Promise;
}
