import type { CubieType } from "../../primitives";
import type { AxisAngle } from "../../types/angle";
import type { KPuzzle } from "cubing/kpuzzle";

import {
  generateVirtualCubeImplementation,
  VIRTUAL_CUBE_IMPLEMENTATIONS,
} from "../virtual-cube-implementation";
import {
  CenterCubie444,
  CornerCubie444,
  EdgeCubie444,
} from "./444-cubie-types";
import { puzzles } from "cubing/puzzles";
import { Vector3 } from "three";

/**
 * Cubing.js only exposes kpuzzles through an async kpuzzle: () => Promise<KPuzzle> api.
 */
let kpuzzlePromise: Promise<KPuzzle> | null = null;
function get4x4KPuzzle(): Promise<KPuzzle> {
  if (!kpuzzlePromise) {
    kpuzzlePromise = puzzles["4x4x4"].kpuzzle();
  }
  return kpuzzlePromise;
}

const ORBIT_NAME_CUBIE_MAPPING: Record<string, CubieType> = {
  CENTERS: CenterCubie444,
  EDGES: EdgeCubie444,
  CORNERS: CornerCubie444,
};

const MOVE_TRANSFORMS_4x4: Record<string, AxisAngle> = {
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

export const VirtualCube4x4x4 = generateVirtualCubeImplementation(
  get4x4KPuzzle,
  ORBIT_NAME_CUBIE_MAPPING,
  MOVE_TRANSFORMS_4x4
);

VIRTUAL_CUBE_IMPLEMENTATIONS.set("4x4x4", VirtualCube4x4x4);
