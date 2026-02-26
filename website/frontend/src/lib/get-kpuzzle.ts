import type { RoomEvent } from "@btime/types";
import type { KPuzzle } from "cubing/kpuzzle";

import { cube2x2x2, cube3x3x3 } from "cubing/puzzles";

// cache the kpuzzle on browser like is done in virtual-cubing-react
let kpuzzle333Promise: Promise<KPuzzle>;
export function get3x3x3(): Promise<KPuzzle> {
  if (!kpuzzle333Promise) {
    kpuzzle333Promise = cube3x3x3.kpuzzle();
  }
  return kpuzzle333Promise;
}

let kpuzzle222Promise: Promise<KPuzzle>;
export function get2x2x2(): Promise<KPuzzle> {
  if (!kpuzzle222Promise) {
    kpuzzle222Promise = cube2x2x2.kpuzzle();
  }
  return kpuzzle222Promise;
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
};
