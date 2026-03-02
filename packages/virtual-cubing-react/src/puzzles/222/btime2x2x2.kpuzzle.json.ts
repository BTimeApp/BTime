import type { KPuzzleDefinition } from "cubing/kpuzzle";

/**
 * This file is based on https://github.com/cubing/cubing.js/blob/cc444bfa3d07f3e47e4802c7be2019947eb34f06/src/cubing/puzzles/implementations/dynamic/side-events/2x2x2.kpuzzle.json.ts
 *
 * Since the cubing.js 2x2 definition puts some setup notation in derivedMoves, it is incompatible with our parsing
 * strategy in VirtualCubeImplementation. This file turns those derivedMoves definitions into normal move definitions.
 */
export const cube2x2x2JSON: KPuzzleDefinition = {
  name: "2x2x2",
  orbits: [{ orbitName: "CORNERS", numPieces: 8, numOrientations: 3 }],
  defaultPattern: {
    CORNERS: {
      pieces: [0, 1, 2, 3, 4, 5, 6, 7],
      orientation: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  moves: {
    U: {
      CORNERS: {
        permutation: [1, 2, 3, 0, 4, 5, 6, 7],
        orientationDelta: [0, 0, 0, 0, 0, 0, 0, 0],
      },
    },
    L: {
      CORNERS: {
        permutation: [0, 1, 6, 2, 4, 3, 5, 7],
        orientationDelta: [0, 0, 2, 1, 0, 2, 1, 0],
      },
    },
    F: {
      CORNERS: {
        permutation: [3, 1, 2, 5, 0, 4, 6, 7],
        orientationDelta: [1, 0, 0, 2, 2, 1, 0, 0],
      },
    },
    R: {
      CORNERS: {
        permutation: [4, 0, 2, 3, 7, 5, 6, 1],
        orientationDelta: [2, 1, 0, 0, 1, 0, 0, 2],
      },
    },
    B: {
      CORNERS: {
        permutation: [0, 7, 1, 3, 4, 5, 2, 6],
        orientationDelta: [0, 2, 1, 0, 0, 0, 2, 1],
      },
    },
    D: {
      CORNERS: {
        permutation: [0, 1, 2, 3, 5, 6, 7, 4],
        orientationDelta: [0, 0, 0, 0, 0, 0, 0, 0],
      },
    },
    x: {
      CORNERS: {
        permutation: [4, 0, 3, 5, 7, 6, 2, 1],
        orientationDelta: [2, 1, 2, 1, 1, 2, 1, 2],
      },
    },
    y: {
      CORNERS: {
        permutation: [1, 2, 3, 0, 7, 4, 5, 6],
        orientationDelta: [0, 0, 0, 0, 0, 0, 0, 0],
      },
    },
    z: {
      CORNERS: {
        permutation: [3, 2, 6, 5, 0, 4, 7, 1],
        orientationDelta: [1, 2, 1, 2, 2, 1, 2, 1],
      },
    },
  },
  derivedMoves: {
    Uv: "y",
    Lv: "x'",
    Fv: "z",
    Rv: "x",
    Bv: "z'",
    Dv: "y'",
  },
};
