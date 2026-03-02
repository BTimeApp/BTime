import type { CubieType } from "../../primitives";
import type { AxisAngle } from "../../types/angle";
import type { KPuzzle } from "cubing/kpuzzle";

import {
  generateVirtualCubeImplementation,
  VIRTUAL_CUBE_IMPLEMENTATIONS,
} from "../virtual-cube-implementation";
import {
  Center1Cubie555,
  Center2Cubie555,
  Center3Cubie555,
  Edge1Cubie555,
  Edge2Cubie555,
  CornerCubie555,
} from "./555-cubie-types";
import { puzzles } from "cubing/puzzles";
import { Vector3 } from "three";

/**
 * Cubing.js only exposes kpuzzles through an async kpuzzle: () => Promise<KPuzzle> api.
 */
let kpuzzlePromise: Promise<KPuzzle> | null = null;
function get5x5KPuzzle(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = puzzles["5x5x5"].kpuzzle();
  }
  return kpuzzlePromise;
}

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CENTERS: Center1Cubie555,
  CENTERS2: Center2Cubie555,
  CENTERS3: Center3Cubie555,
  EDGES: Edge1Cubie555,
  EDGES2: Edge2Cubie555,
  CORNERS: CornerCubie555,
};

const MOVE_TRANSFORMS_5x5: Record<string, AxisAngle> = {
  U: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  D: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  F: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  B: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  R: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  L: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  // M: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },
  // E: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  // S: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },

  u: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  d: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  f: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  b: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  r: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  l: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  Uw: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  Dw: { axis: new Vector3(0, 1, 0), angle: Math.PI / 2 },
  Fw: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
  Bw: { axis: new Vector3(0, 0, 1), angle: Math.PI / 2 },
  Rw: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  Lw: { axis: new Vector3(1, 0, 0), angle: Math.PI / 2 },

  x: { axis: new Vector3(1, 0, 0), angle: -Math.PI / 2 },
  y: { axis: new Vector3(0, 1, 0), angle: -Math.PI / 2 },
  z: { axis: new Vector3(0, 0, 1), angle: -Math.PI / 2 },
};

export const VirtualCube5x5x5 = generateVirtualCubeImplementation(
  get5x5KPuzzle,
  ORBIT_NAME_CUBIE_MAPPING,
  MOVE_TRANSFORMS_5x5
);

VIRTUAL_CUBE_IMPLEMENTATIONS.set("5x5x5", VirtualCube5x5x5);
