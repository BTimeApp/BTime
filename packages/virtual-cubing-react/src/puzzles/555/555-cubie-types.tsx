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

const PIECE_SCALE_FACTOR_555 = 0.6;
const CENTER_GEOMETRY = centerCubieGeometryGenerator(PIECE_SCALE_FACTOR_555);
const EDGE_GEOMETRY = edgeCubieGeometryGenerator(PIECE_SCALE_FACTOR_555);
const CORNER_GEOMETRY = cornerCubieGeometryGenerator(PIECE_SCALE_FACTOR_555);

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
 * CENTER1 positions (+ center1s):
 * Ub Ur Uf Ul
 * Lu Lf Ld Lb
 * Fu Fr Fd Fl
 * Ru Rb Rd Rf
 * Bu Bl Bd Br
 * Df Dr Db Dl
 */
const CENTER1_POSITION_TO_TRANSLATION: Record<
  number,
  [number, number, number]
> = {
  0: [0, 2 * PIECE_SCALE_FACTOR_555, -PIECE_SCALE_FACTOR_555],
  1: [PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555, 0],
  2: [0, 2 * PIECE_SCALE_FACTOR_555, PIECE_SCALE_FACTOR_555],
  3: [-PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555, 0],
  4: [-2 * PIECE_SCALE_FACTOR_555, PIECE_SCALE_FACTOR_555, 0],
  5: [-2 * PIECE_SCALE_FACTOR_555, 0, PIECE_SCALE_FACTOR_555],
  6: [-2 * PIECE_SCALE_FACTOR_555, -PIECE_SCALE_FACTOR_555, 0],
  7: [-2 * PIECE_SCALE_FACTOR_555, 0, -PIECE_SCALE_FACTOR_555],
  8: [0, PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555],
  9: [PIECE_SCALE_FACTOR_555, 0, 2 * PIECE_SCALE_FACTOR_555],
  10: [0, -PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555],
  11: [-PIECE_SCALE_FACTOR_555, 0, 2 * PIECE_SCALE_FACTOR_555],
  12: [2 * PIECE_SCALE_FACTOR_555, PIECE_SCALE_FACTOR_555, 0],
  13: [2 * PIECE_SCALE_FACTOR_555, 0, -PIECE_SCALE_FACTOR_555],
  14: [2 * PIECE_SCALE_FACTOR_555, -PIECE_SCALE_FACTOR_555, 0],
  15: [2 * PIECE_SCALE_FACTOR_555, 0, PIECE_SCALE_FACTOR_555],
  16: [0, PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555],
  17: [-PIECE_SCALE_FACTOR_555, 0, -2 * PIECE_SCALE_FACTOR_555],
  18: [0, -PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555],
  19: [PIECE_SCALE_FACTOR_555, 0, -2 * PIECE_SCALE_FACTOR_555],
  20: [0, -2 * PIECE_SCALE_FACTOR_555, PIECE_SCALE_FACTOR_555],
  21: [PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555, 0],
  22: [0, -2 * PIECE_SCALE_FACTOR_555, -PIECE_SCALE_FACTOR_555],
  23: [-PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555, 0],
};
/**
 * x centers and + centers have the same position to rotation mapping
 */
const CENTER12_POSITION_TO_ROTATION: Record<number, Quaternion> = {
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
const CENTER1_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  2: new Quaternion(0, 1, 0, 0),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
};

const CENTER12_ID_TO_COLOR_MAP: Record<
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

function center1Cubie555PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid position for CENTER1 cubie (must be in range [0, 23]): ${position}`
    );
  }
  return {
    position: CENTER1_POSITION_TO_TRANSLATION[position],
    quaternion: CENTER12_POSITION_TO_ROTATION[position],
  };
}

/**
 * All center types for 5x5 have the same orientation to transform
 */
function centerCubie555OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 3) {
    throw new Error(
      `Invalid orientation for CENTER1 cubie (must be in range [0, 3]): ${orientation}`
    );
  }
  return {
    quaternion: CENTER1_ORIENTATION_TO_ROTATION[orientation],
  };
}
const LEGAL_CENTER1_CUBIE_555_IDS = new Set([0, 4, 8, 12, 16, 20]);

/**
 * Both x-centers and +-centers on 5x5 use the same ID scheme
 */
function center12Cubie555IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (!LEGAL_CENTER1_CUBIE_555_IDS.has(position)) {
    throw new Error(
      `Invalid Id for CENTER1 cubie (must be one of ${[
        ...LEGAL_CENTER1_CUBIE_555_IDS.keys(),
      ]}): ${position}`
    );
  }
  return CENTER12_ID_TO_COLOR_MAP[position];
}

export const Center1Cubie555 = generateCubieType<BoxFace>(
  center1Cubie555PositionToTransform,
  centerCubie555OrientationToTransform,
  center12Cubie555IdToColors,
  CenterGeometrySource
);

/**
 * CENTER2 positions (x centers):
 * Ubl, Ubr, Ufr, Ufl
 * Lub, Luf, Ldf, Ldb
 * Ful, Fur, Fdr, Fdl
 * Ruf, Rub, Rdb, Rdf
 * Bur, Bul, Bdl, Bdr
 * Dfl, Dfr, Dbr, Dbl
 */
const CENTER2_POSITION_TO_TRANSLATION: Record<
  number,
  [number, number, number]
> = {
  0: [
    -PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  1: [
    PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  2: [
    PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  3: [
    -PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  4: [
    -2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  5: [
    -2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  6: [
    -2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  7: [
    -2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  8: [
    -PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
  ],
  9: [
    PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
  ],
  10: [
    PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
  ],
  11: [
    -PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    2 * PIECE_SCALE_FACTOR_555,
  ],
  12: [
    2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  13: [
    2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  14: [
    2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  15: [
    2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  16: [
    PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
  ],
  17: [
    -PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
  ],
  18: [
    -PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
  ],
  19: [
    PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
  ],
  20: [
    -PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  21: [
    PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
    PIECE_SCALE_FACTOR_555,
  ],
  22: [
    PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
  23: [
    -PIECE_SCALE_FACTOR_555,
    -2 * PIECE_SCALE_FACTOR_555,
    -PIECE_SCALE_FACTOR_555,
  ],
};

function center2Cubie555PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid position for CENTER2 cubie (must be in range [0, 23]): ${position}`
    );
  }
  return {
    position: CENTER2_POSITION_TO_TRANSLATION[position],
    quaternion: CENTER12_POSITION_TO_ROTATION[position],
  };
}

export const Center2Cubie555 = generateCubieType<BoxFace>(
  center2Cubie555PositionToTransform,
  centerCubie555OrientationToTransform,
  center12Cubie555IdToColors,
  CenterGeometrySource
);

/**
 * CENTER3 positions (true centers):
 * F, R, D, U, L, B (why???)
 */
const CENTER3_POSITION_TO_TRANSLATION: Record<
  number,
  [number, number, number]
> = {
  0: [0, 0, 2 * PIECE_SCALE_FACTOR_555],
  1: [2 * PIECE_SCALE_FACTOR_555, 0, 0],
  2: [0, -2 * PIECE_SCALE_FACTOR_555, 0],
  3: [0, 2 * PIECE_SCALE_FACTOR_555, 0],
  4: [-2 * PIECE_SCALE_FACTOR_555, 0, 0],
  5: [0, 0, -2 * PIECE_SCALE_FACTOR_555],
};

/**
 * x centers and + centers have the same position to rotation mapping
 */
const CENTER3_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  1: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  2: new Quaternion(0, 0, 1, 0),
  3: new Quaternion(0, 0, 0, 1),
  4: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  5: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
};

function center3Cubie555PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 5) {
    throw new Error(
      `Invalid position for CENTER3 cubie (must be in range [0, 5]): ${position}`
    );
  }
  return {
    position: CENTER3_POSITION_TO_TRANSLATION[position],
    quaternion: CENTER3_POSITION_TO_ROTATION[position],
  };
}

const CENTER3_ID_TO_COLOR_MAP: Record<
  number,
  Partial<Record<BoxFace, Color>>
> = {
  0: {
    "+y": COLOR_GREEN,
  },
  1: {
    "+y": COLOR_RED,
  },
  2: {
    "+y": COLOR_YELLOW,
  },
  3: {
    "+y": COLOR_WHITE,
  },
  4: {
    "+y": COLOR_ORANGE,
  },
  5: {
    "+y": COLOR_BLUE,
  },
};

/**
 * Both x-centers and +-centers on 5x5 use the same ID scheme
 */
function center3Cubie555IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 5) {
    throw new Error(
      `Invalid id for CENTER3 cubie (must be in range [0, 5]): ${position}`
    );
  }
  return CENTER3_ID_TO_COLOR_MAP[position];
}

export const Center3Cubie555 = generateCubieType<BoxFace>(
  center3Cubie555PositionToTransform,
  centerCubie555OrientationToTransform,
  center3Cubie555IdToColors,
  CenterGeometrySource
);

/**
 * EDGE1 (wing) positions:
 * UBl, URb, UFr, ULf
 * LUb, LFu, LDf, LBd
 * FUl, FRu, FDr, FLd
 * Ruf, RBu, RDb, RFd
 * BUr, BLu, BDl, BRd
 * DFl, DRf, DBr, DLb
 */
const EDGE1_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [
      -PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    1: [
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
    ],
    2: [
      PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    3: [
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
    ],
    4: [
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
    ],
    5: [
      -2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    6: [
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
    ],
    7: [
      -2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    8: [
      -PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    9: [
      2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    10: [
      PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    11: [
      -2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    12: [
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
    ],
    13: [
      2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    14: [
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
    ],
    15: [
      2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    16: [
      PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    17: [
      -2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    18: [
      -PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    19: [
      2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    20: [
      -PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    21: [
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      PIECE_SCALE_FACTOR_555,
    ],
    22: [
      PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    23: [
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -PIECE_SCALE_FACTOR_555,
    ],
  };

const EDGE1_POSITION_TO_ROTATION: Record<number, Quaternion> = {
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

// applies to both wings and midges
const EDGE_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, Math.sqrt(2) / 2, 0),
};

const EDGE1_ID_TO_COLOR_MAP: Record<number, Partial<Record<BoxFace, Color>>> = {
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

function edge1Cubie555PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid position for edge cubie (must be in range [0, 23]): ${position}`
    );
  }
  return {
    position: EDGE1_POSITION_TO_TRANSLATION[position],
    quaternion: EDGE1_POSITION_TO_ROTATION[position],
  };
}

function edgeCubie555OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 1) {
    throw new Error(
      `Invalid orientation for edge cubie (must be in range [0, 1]): ${orientation}`
    );
  }
  return {
    quaternion: EDGE_ORIENTATION_TO_ROTATION[orientation],
  };
}

function edge1Cubie555IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 23) {
    throw new Error(
      `Invalid id for edge cubie (must be in range [0, 23]): ${position}`
    );
  }
  return EDGE1_ID_TO_COLOR_MAP[position];
}

export const Edge1Cubie555 = generateCubieType<BoxFace>(
  edge1Cubie555PositionToTransform,
  edgeCubie555OrientationToTransform,
  edge1Cubie555IdToColors,
  EdgeGeometrySource
);

/**
 * EDGE2 (midge) positions:
 * DF, FL, DR, DB, FR, DL, UR, BR, UL, UB, BL, UF (WTF???)
 */
const EDGE2_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [0, -2 * PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555],
    1: [-2 * PIECE_SCALE_FACTOR_555, 0, 2 * PIECE_SCALE_FACTOR_555],
    2: [2 * PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555, 0],
    3: [0, -2 * PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555],
    4: [2 * PIECE_SCALE_FACTOR_555, 0, 2 * PIECE_SCALE_FACTOR_555],
    5: [-2 * PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555, 0],
    6: [2 * PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555, 0],
    7: [2 * PIECE_SCALE_FACTOR_555, 0, -2 * PIECE_SCALE_FACTOR_555],
    8: [-2 * PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555, 0],
    9: [0, 2 * PIECE_SCALE_FACTOR_555, -2 * PIECE_SCALE_FACTOR_555],
    10: [-2 * PIECE_SCALE_FACTOR_555, 0, -2 * PIECE_SCALE_FACTOR_555],
    11: [0, 2 * PIECE_SCALE_FACTOR_555, 2 * PIECE_SCALE_FACTOR_555],
  };

const EDGE2_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 1, 0),
  1: new Quaternion(-0.5, 0.5, 0.5, -0.5),
  2: new Quaternion(Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  3: new Quaternion(1, 0, 0, 0),
  4: new Quaternion(0.5, 0.5, 0.5, 0.5),
  5: new Quaternion(-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  6: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
  7: new Quaternion(0.5, -0.5, 0.5, -0.5),
  8: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  9: new Quaternion(0, 1, 0, 0),
  10: new Quaternion(-0.5, -0.5, 0.5, 0.5),
  11: new Quaternion(0, 0, 0, 1),
};

const EDGE2_ID_TO_COLOR_MAP: Record<number, Partial<Record<BoxFace, Color>>> = {
  0: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_GREEN,
  },
  1: {
    "+y": COLOR_GREEN,
    "+z": COLOR_ORANGE,
  },
  2: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_RED,
  },
  3: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_BLUE,
  },
  4: {
    "+y": COLOR_GREEN,
    "+z": COLOR_RED,
  },
  5: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_ORANGE,
  },
  6: {
    "+y": COLOR_WHITE,
    "+z": COLOR_RED,
  },
  7: {
    "+y": COLOR_BLUE,
    "+z": COLOR_RED,
  },
  8: {
    "+y": COLOR_WHITE,
    "+z": COLOR_ORANGE,
  },
  9: {
    "+y": COLOR_WHITE,
    "+z": COLOR_BLUE,
  },
  10: {
    "+y": COLOR_BLUE,
    "+z": COLOR_ORANGE,
  },
  11: {
    "+y": COLOR_WHITE,
    "+z": COLOR_GREEN,
  },
};

function edge2Cubie555PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 11) {
    throw new Error(
      `Invalid position for edge cubie (must be in range [0, 11]): ${position}`
    );
  }
  return {
    position: EDGE2_POSITION_TO_TRANSLATION[position],
    quaternion: EDGE2_POSITION_TO_ROTATION[position],
  };
}

function edge2Cubie555IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 11) {
    throw new Error(
      `Invalid id for edge cubie (must be in range [0, 11]): ${position}`
    );
  }
  return EDGE2_ID_TO_COLOR_MAP[position];
}

export const Edge2Cubie555 = generateCubieType<BoxFace>(
  edge2Cubie555PositionToTransform,
  edgeCubie555OrientationToTransform,
  edge2Cubie555IdToColors,
  EdgeGeometrySource
);

/**
 * corner positions (and orientations):
 * URF, UBR, ULB, UFL, DFR, DLF, DBL, DRB
 */
const CORNER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    1: [
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    2: [
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    3: [
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    4: [
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    5: [
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      2 * PIECE_SCALE_FACTOR_555,
    ],
    6: [
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
    ],
    7: [
      2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
      -2 * PIECE_SCALE_FACTOR_555,
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

function cornerCubie555PositionToTransform(position: number): GroupProps {
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

function cornerCubie555OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 2) {
    throw new Error(
      `Invalid orientation for corner cubie (must be in range [0, 2]): ${orientation}`
    );
  }
  return {
    quaternion: CORNER_ORIENTATION_TO_ROTATION[orientation],
  };
}

function cornerCubie555IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 7) {
    throw new Error(
      `Invalid id for corner cubie (must be in range [0, 7]): ${position}`
    );
  }
  return CORNER_ID_TO_COLOR_MAP[position];
}

export const CornerCubie555 = generateCubieType<BoxFace>(
  cornerCubie555PositionToTransform,
  cornerCubie555OrientationToTransform,
  cornerCubie555IdToColors,
  CornerGeometrySource
);
