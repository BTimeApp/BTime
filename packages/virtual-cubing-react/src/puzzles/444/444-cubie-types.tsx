import type { BoxFace, GeometrySpec, GroupProps } from "../../types";
import type { Color } from "three";

import { generateCubieType } from "../../primitives";
import {
  BOX_GEOMETRY_FACE_ORDER,
  centerCubieGeometryGenerator,
  cornerCubieGeometryGenerator,
  edgeCubieGeometryGenerator,
} from "../../types/box-geometry";
import {
  COLOR_BLUE,
  COLOR_GREEN,
  COLOR_ORANGE,
  COLOR_RED,
  COLOR_WHITE,
  COLOR_YELLOW,
} from "../../types/colors";
import { Quaternion } from "three";

const PIECE_SCALE_FACTOR_444 = 0.75;
const CENTER_GEOMETRY = centerCubieGeometryGenerator(PIECE_SCALE_FACTOR_444);
const EDGE_GEOMETRY = edgeCubieGeometryGenerator(PIECE_SCALE_FACTOR_444);
const CORNER_GEOMETRY = cornerCubieGeometryGenerator(PIECE_SCALE_FACTOR_444);

const CenterGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: CENTER_GEOMETRY,
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

const EdgeGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: EDGE_GEOMETRY,
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

const CornerGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: CORNER_GEOMETRY,
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

/**
 * CENTER positions:
 * Ubl, Ubr, Ufr, Ufl
 * Lub, Luf, Ldf, Ldb
 * Ful, Fur, Fdr, Fdl
 * Ruf, Rub, Rdb, Rdf
 * Bur, Bul, Bdl, Bdr
 * Dfl, Dfr, Dbr, Dbl
 */
const CENTER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    1: [
      0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    2: [
      0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    3: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    4: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    5: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    6: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    7: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    8: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    9: [
      0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    10: [
      0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    11: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    12: [
      1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    13: [
      1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    14: [
      1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    15: [
      1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    16: [
      0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    17: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    18: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    19: [
      0.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    20: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    21: [
      0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      0.5 * PIECE_SCALE_FACTOR_444,
    ],
    22: [
      0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
    23: [
      -0.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      -0.5 * PIECE_SCALE_FACTOR_444,
    ],
  };
const CENTER_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, 0, 0, 1),
  2: new Quaternion(0, 0, 0, 1),
  3: new Quaternion(0, 0, 0, 1),
  4: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  5: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  6: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  7: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  8: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  9: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  10: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  11: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  12: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  13: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  14: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  15: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  16: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  17: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  18: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  19: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  20: new Quaternion(0, 0, 1, 0),
  21: new Quaternion(0, 0, 1, 0),
  22: new Quaternion(0, 0, 1, 0),
  23: new Quaternion(0, 0, 1, 0),
};
const CENTER_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  2: new Quaternion(0, 1, 0, 0),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
};

const CENTER_ID_TO_COLOR_MAP: Record<
  number,
  Partial<Record<BoxFace, Color>>
> = {
  0: {
    "+y": COLOR_WHITE,
  },
  4: {
    "+y": COLOR_ORANGE,
  },
  8: {
    "+y": COLOR_GREEN,
  },
  12: {
    "+y": COLOR_RED,
  },
  16: {
    "+y": COLOR_BLUE,
  },
  20: {
    "+y": COLOR_YELLOW,
  },
};

function centerCubie444PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid position for center cubie (must be in range [0, 23]): ${position}`
    );
  }
  return {
    position: CENTER_POSITION_TO_TRANSLATION[position],
    quaternion: CENTER_POSITION_TO_ROTATION[position],
  };
}

function centerCubie444OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 3) {
    throw new Error(
      `Invalid orientation for center cubie (must be in range [0, 3]): ${orientation}`
    );
  }
  return {
    quaternion: CENTER_ORIENTATION_TO_ROTATION[orientation],
  };
}
const LEGAL_CENTER_CUBIE_444_IDS = new Set([0, 4, 8, 12, 16, 20]);

function centerCubie444IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (!LEGAL_CENTER_CUBIE_444_IDS.has(position)) {
    throw new Error(
      `Invalid Id for center cubie (must be one of ${[
        ...LEGAL_CENTER_CUBIE_444_IDS.keys(),
      ]}): ${position}`
    );
  }
  return CENTER_ID_TO_COLOR_MAP[position];
}

export const CenterCubie444 = generateCubieType<BoxFace>(
  centerCubie444PositionToTransform,
  centerCubie444OrientationToTransform,
  centerCubie444IdToColors,
  CenterGeometrySource
);

/**
 * EDGE (wing) positions:
 * UBl, URb, UFr, ULf
 * LUb, LFu, LDf, LBd
 * FUl, FRu, FDr, FLd
 * Ruf, RBu, RDb, RFd
 * BUr, BLu, BDl, BRd
 * DFl, DRf, DBr, DLb
 */
const EDGE_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> = {
  0: [
    -0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  1: [
    1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
  ],
  2: [
    0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  3: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
  ],
  4: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
  ],
  5: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  6: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
  ],
  7: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  8: [
    -0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  9: [
    1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  10: [
    0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  11: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  12: [
    1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
  ],
  13: [
    1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  14: [
    1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
  ],
  15: [
    1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  16: [
    0.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  17: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  18: [
    -0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  19: [
    1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  20: [
    -0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    1.5 * PIECE_SCALE_FACTOR_444,
  ],
  21: [
    1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    0.5 * PIECE_SCALE_FACTOR_444,
  ],
  22: [
    0.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
  ],
  23: [
    -1.5 * PIECE_SCALE_FACTOR_444,
    -1.5 * PIECE_SCALE_FACTOR_444,
    -0.5 * PIECE_SCALE_FACTOR_444,
  ],
};

const EDGE_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 1, 0, 0),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
  2: new Quaternion(0, 0, 0, 1),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  4: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  5: new Quaternion(-0.5, 0.5, 0.5, -0.5),
  6: new Quaternion(-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  7: new Quaternion(-0.5, -0.5, 0.5, 0.5),
  8: new Quaternion(0, 0, 0, 1),
  9: new Quaternion(0.5, 0.5, 0.5, 0.5),
  10: new Quaternion(0, 0, 1, 0),
  11: new Quaternion(-0.5, 0.5, 0.5, -0.5),
  12: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
  13: new Quaternion(0.5, -0.5, 0.5, -0.5),
  14: new Quaternion(Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  15: new Quaternion(0.5, 0.5, 0.5, 0.5),
  16: new Quaternion(0, 1, 0, 0),
  17: new Quaternion(-0.5, -0.5, 0.5, 0.5),
  18: new Quaternion(1, 0, 0, 0),
  19: new Quaternion(0.5, -0.5, 0.5, -0.5),
  20: new Quaternion(0, 0, 1, 0),
  21: new Quaternion(Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  22: new Quaternion(1, 0, 0, 0),
  23: new Quaternion(-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
};
const EDGE_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, Math.sqrt(2) / 2, 0),
};

const EDGE_ID_TO_COLOR_MAP: Record<number, Partial<Record<BoxFace, Color>>> = {
  0: {
    "+y": COLOR_WHITE,
    "+z": COLOR_BLUE,
  },
  1: {
    "+y": COLOR_WHITE,
    "+z": COLOR_RED,
  },
  2: {
    "+y": COLOR_WHITE,
    "+z": COLOR_GREEN,
  },
  3: {
    "+y": COLOR_WHITE,
    "+z": COLOR_ORANGE,
  },
  4: {
    "+y": COLOR_WHITE,
    "+z": COLOR_ORANGE,
  },
  5: {
    "+y": COLOR_GREEN,
    "+z": COLOR_ORANGE,
  },
  6: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_ORANGE,
  },
  7: {
    "+y": COLOR_BLUE,
    "+z": COLOR_ORANGE,
  },
  8: {
    "+y": COLOR_WHITE,
    "+z": COLOR_GREEN,
  },
  9: {
    "+y": COLOR_GREEN,
    "+z": COLOR_RED,
  },
  10: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_GREEN,
  },
  11: {
    "+y": COLOR_GREEN,
    "+z": COLOR_ORANGE,
  },
  12: {
    "+y": COLOR_WHITE,
    "+z": COLOR_RED,
  },
  13: {
    "+y": COLOR_BLUE,
    "+z": COLOR_RED,
  },
  14: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_RED,
  },
  15: {
    "+y": COLOR_GREEN,
    "+z": COLOR_RED,
  },
  16: {
    "+y": COLOR_WHITE,
    "+z": COLOR_BLUE,
  },
  17: {
    "+y": COLOR_BLUE,
    "+z": COLOR_ORANGE,
  },
  18: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_BLUE,
  },
  19: {
    "+y": COLOR_BLUE,
    "+z": COLOR_RED,
  },
  20: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_GREEN,
  },
  21: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_RED,
  },
  22: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_BLUE,
  },
  23: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_ORANGE,
  },
};

function edgeCubie444PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid position for edge cubie (must be in range [0, 23]): ${position}`
    );
  }
  return {
    position: EDGE_POSITION_TO_TRANSLATION[position],
    quaternion: EDGE_POSITION_TO_ROTATION[position],
  };
}

function edgeCubie444OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 1) {
    throw new Error(
      `Invalid orientation for edge cubie (must be in range [0, 1]): ${orientation}`
    );
  }
  return {
    quaternion: EDGE_ORIENTATION_TO_ROTATION[orientation],
  };
}

function edgeCubie444IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid id for edge cubie (must be in range [0, 23]): ${position}`
    );
  }
  return EDGE_ID_TO_COLOR_MAP[position];
}

export const EdgeCubie444 = generateCubieType<BoxFace>(
  edgeCubie444PositionToTransform,
  edgeCubie444OrientationToTransform,
  edgeCubie444IdToColors,
  EdgeGeometrySource
);

/**
 * corner positions (and orientations):
 * URF, UBR, ULB, UFL, DFR, DLF, DBL, DRB
 */
const CORNER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [
      1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    1: [
      1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    2: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    3: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    4: [
      1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    5: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      1.5 * PIECE_SCALE_FACTOR_444,
    ],
    6: [
      -1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
    7: [
      1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
      -1.5 * PIECE_SCALE_FACTOR_444,
    ],
  };
const CORNER_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
  2: new Quaternion(0, 1, 0, 0),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  4: new Quaternion(Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  5: new Quaternion(0, 0, 1, 0),
  6: new Quaternion(-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  7: new Quaternion(1, 0, 0, 0),
};
const CORNER_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0.5, 0.5, 0.5, -0.5),
  2: new Quaternion(0.5, 0.5, 0.5, 0.5),
};

const CORNER_ID_TO_COLOR_MAP: Record<
  number,
  Partial<Record<BoxFace, Color>>
> = {
  0: {
    "+x": COLOR_RED,
    "+y": COLOR_WHITE,
    "+z": COLOR_GREEN,
  },
  1: {
    "+x": COLOR_BLUE,
    "+y": COLOR_WHITE,
    "+z": COLOR_RED,
  },
  2: {
    "+x": COLOR_ORANGE,
    "+y": COLOR_WHITE,
    "+z": COLOR_BLUE,
  },
  3: {
    "+x": COLOR_GREEN,
    "+y": COLOR_WHITE,
    "+z": COLOR_ORANGE,
  },
  4: {
    "+x": COLOR_GREEN,
    "+y": COLOR_YELLOW,
    "+z": COLOR_RED,
  },
  5: {
    "+x": COLOR_ORANGE,
    "+y": COLOR_YELLOW,
    "+z": COLOR_GREEN,
  },
  6: {
    "+x": COLOR_BLUE,
    "+y": COLOR_YELLOW,
    "+z": COLOR_ORANGE,
  },
  7: {
    "+x": COLOR_RED,
    "+y": COLOR_YELLOW,
    "+z": COLOR_BLUE,
  },
};

function cornerCubie444PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 7) {
    throw new Error(
      `Invalid position for corner cubie (must be in range [0, 7]): ${position}`
    );
  }
  return {
    position: CORNER_POSITION_TO_TRANSLATION[position],
    quaternion: CORNER_POSITION_TO_ROTATION[position],
  };
}

function cornerCubie444OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 2) {
    throw new Error(
      `Invalid orientation for corner cubie (must be in range [0, 2]): ${orientation}`
    );
  }
  return {
    quaternion: CORNER_ORIENTATION_TO_ROTATION[orientation],
  };
}

function cornerCubie444IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 7) {
    throw new Error(
      `Invalid id for corner cubie (must be in range [0, 7]): ${position}`
    );
  }
  return CORNER_ID_TO_COLOR_MAP[position];
}

export const CornerCubie444 = generateCubieType<BoxFace>(
  cornerCubie444PositionToTransform,
  cornerCubie444OrientationToTransform,
  cornerCubie444IdToColors,
  CornerGeometrySource
);
