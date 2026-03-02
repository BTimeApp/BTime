import type { RoomEvent } from "@btime/types";
import type { KPuzzle } from "cubing/kpuzzle";

import { cube2x2x2, cube3x3x3, puzzles } from "cubing/puzzles";

// cache the kpuzzle on browser like is done in virtual-cubing-react
// TODO: consider just using the promises/kpuzzle definitions from virtual-cubing-react!

let kpuzzle333Promise: Promise<KPuzzle>;
function get3x3x3(): Promise<KPuzzle> {
  if (!kpuzzle333Promise) {
    kpuzzle333Promise = cube3x3x3.kpuzzle();
  }
  return kpuzzle333Promise;
}

let kpuzzle222Promise: Promise<KPuzzle>;
function get2x2x2(): Promise<KPuzzle> {
  if (!kpuzzle222Promise) {
    kpuzzle222Promise = cube2x2x2.kpuzzle();
  }
  return kpuzzle222Promise;
}

let kpuzzle444Promise: Promise<KPuzzle> | null = null;
function get4x4x4(): Promise<KPuzzle> {
  if (!kpuzzle444Promise) {
    kpuzzle444Promise = puzzles["4x4x4"].kpuzzle();
  }
  return kpuzzle444Promise;
}

let kpuzzle555Promise: Promise<KPuzzle> | null = null;
function get5x5x5(): Promise<KPuzzle> {
  if (!kpuzzle555Promise) {
    kpuzzle555Promise = puzzles["5x5x5"].kpuzzle();
  }
  return kpuzzle555Promise;
}

/**
 * Mapping of room events to kpuzzle (to be used in virtual-timer).
 * Needs to use Partial typing b/c we don't support every possible RoomEvent yet.
 */
export const EVENT_KPUZZLE_GETTERS: Partial<
  Record<RoomEvent, () => Promise<KPuzzle>>
> = {
  "333": get3x3x3,
  "222": get2x2x2,
  "444": get4x4x4,
  "555": get5x5x5,
};
