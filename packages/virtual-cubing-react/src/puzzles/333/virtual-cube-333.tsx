import type { CubieType } from "../../primitives";
import type { AxisAngle } from "../../types/angle";
import type { KPuzzle } from "cubing/kpuzzle";

import {
  generateVirtualCubeImplementation,
  VIRTUAL_CUBE_IMPLEMENTATIONS,
} from "../virtual-cube-implementation";
import {
  CenterCubie333,
  CornerCubie333,
  EdgeCubie333,
} from "./333-cubie-types";
import { cube3x3x3 } from "cubing/puzzles";
import { Vector3 } from "three";

/**
 * Cubing.js only exposes kpuzzles through an async kpuzzle: () => Promise<KPuzzle> api.
 */
let kpuzzlePromise: Promise<KPuzzle> | null = null;
function get3x3KPuzzle(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = cube3x3x3.kpuzzle();
  }
  return kpuzzlePromise;
}

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CENTERS: CenterCubie333,
  EDGES: EdgeCubie333,
  CORNERS: CornerCubie333,
};

/**
 * TODO - this mapping is specific to 3x3, but we need to make a general Move -> Quaternion mapping function
 * once we generalize the VirtualCube into its own component.
 */
const MOVE_TRANSFORMS_3X3: Record<string, AxisAngle> = {
  U: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  D: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  F: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  B: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  R: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  L: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  M: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },
  E: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  S: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },

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

export const VirtualCube3x3x3 = generateVirtualCubeImplementation(
  get3x3KPuzzle,
  ORBIT_NAME_CUBIE_MAPPING,
  MOVE_TRANSFORMS_3X3
);

VIRTUAL_CUBE_IMPLEMENTATIONS.set("3x3x3", VirtualCube3x3x3);
