import type { CubieType } from "../../primitives";
import type { AxisAngle } from "../../types/angle";

import {
  generateVirtualCubeImplementation,
  VIRTUAL_CUBE_IMPLEMENTATIONS,
} from "../virtual-cube-implementation";
import { CornerCubie222 } from "./222-cubie-types";
import { cube2x2x2JSON } from "./btime2x2x2.kpuzzle.json";
import { KPuzzle } from "cubing/kpuzzle";
import { Vector3 } from "three";

/**
 * Cubing.js only exposes kpuzzles through an async kpuzzle: () => Promise<KPuzzle> api.
 * Why? not sure. This loader helps deal with it by caching the definition.
 */

let kpuzzlePromise: Promise<KPuzzle> | null = null;
function get2x2KPuzzle(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = Promise.resolve(new KPuzzle(cube2x2x2JSON));
  }
  return kpuzzlePromise;
}

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CORNERS: CornerCubie222,
};

/**
 * TODO - this mapping is specific to 2x2, but we need to make a general Move -> Quaternion mapping function
 * once we generalize the VirtualCube into its own component.
 */
const MOVE_TRANSFORMS_2x2: Record<string, AxisAngle> = {
  U: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  D: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  F: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  B: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  R: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  L: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  // TODO: check if these are safe to delete, or keep
  // M: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },
  // E: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  // S: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },

  u: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  d: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  f: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  b: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  r: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  l: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  x: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  y: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  z: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
};

export const VirtualCube2x2x2 = generateVirtualCubeImplementation(
  get2x2KPuzzle,
  ORBIT_NAME_CUBIE_MAPPING,
  MOVE_TRANSFORMS_2x2
);

VIRTUAL_CUBE_IMPLEMENTATIONS.set("2x2x2", VirtualCube2x2x2);
