import type { GeometrySpec, GroupProps } from "../../types";
import type { Color } from "three";

import { generateCubieType } from "../../primitives";
import {
  COLOR_BLUE,
  COLOR_GREEN,
  COLOR_ORANGE,
  COLOR_RED,
  COLOR_WHITE,
  COLOR_YELLOW,
} from "../../types/colors";
import { Quaternion } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

type BoxFace = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
const BOX_GEOMETRY_FACE_ORDER: BoxFace[] = ["+x", "-x", "+y", "-y", "+z", "-z"];

const CenterGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: new RoundedBoxGeometry(0.99, 0.995, 0.99, 4, 0.07),
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

const EdgeGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: new RoundedBoxGeometry(0.995, 0.995, 0.995, 4, 0.07),
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

const CornerGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: new RoundedBoxGeometry(0.995, 0.995, 0.995, 4, 0.07),
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

/**
 * CENTER positions:
 * U, L, F, R, B, D
 */
const CENTER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [0, 1, 0],
    1: [-1, 0, 0],
    2: [0, 0, 1],
    3: [1, 0, 0],
    4: [0, 0, -1],
    5: [0, -1, 0],
  };
const CENTER_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, 0, Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  2: new Quaternion(Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  3: new Quaternion(0, 0, -Math.sqrt(2) / 2, Math.sqrt(2) / 2),
  4: new Quaternion(-Math.sqrt(2) / 2, 0, 0, Math.sqrt(2) / 2),
  5: new Quaternion(0, 0, 1, 0),
};
const CENTER_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  2: new Quaternion(0, 1, 0, 0),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
};

const CENTER_POSITION_TO_COLOR_MAP: Record<
  number,
  Partial<Record<BoxFace, Color>>
> = {
  0: {
    "+y": COLOR_WHITE,
  },
  1: {
    "+y": COLOR_ORANGE,
  },
  2: {
    "+y": COLOR_GREEN,
  },
  3: {
    "+y": COLOR_RED,
  },
  4: {
    "+y": COLOR_BLUE,
  },
  5: {
    "+y": COLOR_YELLOW,
  },
};

function centerCubie333PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 5) {
    throw new Error(
      `Invalid position for center cubie (must be in range [0, 5]): ${position}`
    );
  }
  return {
    position: CENTER_POSITION_TO_TRANSLATION[position],
    quaternion: CENTER_POSITION_TO_ROTATION[position],
  };
}

function centerCubie333OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 3) {
    throw new Error(
      `Invalid orientation for center cubie (must be in range [0, 3]): ${orientation}`
    );
  }
  return {
    quaternion: CENTER_ORIENTATION_TO_ROTATION[orientation],
  };
}

function centerCubie333IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 5) {
    throw new Error(
      `Invalid Id for center cubie (must be in range [0, 5]): ${position}`
    );
  }
  return CENTER_POSITION_TO_COLOR_MAP[position];
}

export const CenterCubie = generateCubieType<BoxFace>(
  centerCubie333PositionToTransform,
  centerCubie333OrientationToTransform,
  centerCubie333IdToColors,
  CenterGeometrySource
);

/**
 * EDGE positions:
 * UF, UR, UB, UL, DF, DR, DB, DL, FR, FL, BR, BL
 */
const EDGE_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> = {
  0: [0, 1, 1],
  1: [1, 1, 0],
  2: [0, 1, -1],
  3: [-1, 1, 0],
  4: [0, -1, 1],
  5: [1, -1, 0],
  6: [0, -1, -1],
  7: [-1, -1, 0],
  8: [1, 0, 1],
  9: [-1, 0, 1],
  10: [1, 0, -1],
  11: [-1, 0, -1],
};
const EDGE_POSITION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2),
  2: new Quaternion(0, 1, 0, 0),
  3: new Quaternion(0, Math.sqrt(2) / 2, 0, -Math.sqrt(2) / 2),
  4: new Quaternion(0, 0, 1, 0),
  5: new Quaternion(Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  6: new Quaternion(1, 0, 0, 0),
  7: new Quaternion(-Math.sqrt(2) / 2, 0, Math.sqrt(2) / 2, 0),
  8: new Quaternion(0.5, 0.5, 0.5, 0.5),
  9: new Quaternion(-0.5, 0.5, 0.5, -0.5),
  10: new Quaternion(0.5, -0.5, 0.5, -0.5),
  11: new Quaternion(-0.5, -0.5, 0.5, 0.5),
};
const EDGE_ORIENTATION_TO_ROTATION: Record<number, Quaternion> = {
  0: new Quaternion(0, 0, 0, 1),
  1: new Quaternion(0, Math.sqrt(2) / 2, Math.sqrt(2) / 2, 0),
};

const EDGE_POSITION_TO_COLOR_MAP: Record<
  number,
  Partial<Record<BoxFace, Color>>
> = {
  0: {
    "+y": COLOR_WHITE,
    "+z": COLOR_GREEN,
  },
  1: {
    "+y": COLOR_WHITE,
    "+z": COLOR_RED,
  },
  2: {
    "+y": COLOR_WHITE,
    "+z": COLOR_BLUE,
  },
  3: {
    "+y": COLOR_WHITE,
    "+z": COLOR_ORANGE,
  },
  4: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_GREEN,
  },
  5: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_RED,
  },
  6: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_BLUE,
  },
  7: {
    "+y": COLOR_YELLOW,
    "+z": COLOR_ORANGE,
  },
  8: {
    "+y": COLOR_GREEN,
    "+z": COLOR_RED,
  },
  9: {
    "+y": COLOR_GREEN,
    "+z": COLOR_ORANGE,
  },
  10: {
    "+y": COLOR_BLUE,
    "+z": COLOR_RED,
  },
  11: {
    "+y": COLOR_BLUE,
    "+z": COLOR_ORANGE,
  },
};

function edgeCubie333PositionToTransform(position: number): GroupProps {
  if (position < 0 || position > 11) {
    throw new Error(
      `Invalid position for edge cubie (must be in range [0, 11]): ${position}`
    );
  }
  return {
    position: EDGE_POSITION_TO_TRANSLATION[position],
    quaternion: EDGE_POSITION_TO_ROTATION[position],
  };
}

function edgeCubie333OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 1) {
    throw new Error(
      `Invalid orientation for edge cubie (must be in range [0, 1]): ${orientation}`
    );
  }
  return {
    quaternion: EDGE_ORIENTATION_TO_ROTATION[orientation],
  };
}

function edgeCubie333IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 11) {
    throw new Error(
      `Invalid Id for edge cubie (must be in range [0, 11]): ${position}`
    );
  }
  return EDGE_POSITION_TO_COLOR_MAP[position];
}

export const EdgeCubie = generateCubieType<BoxFace>(
  edgeCubie333PositionToTransform,
  edgeCubie333OrientationToTransform,
  edgeCubie333IdToColors,
  EdgeGeometrySource
);

/**
 * corner positions (and orientations):
 * URF, UBR, ULB, UFL, DFR, DLF, DBL, DRB
 */
const CORNER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [1, 1, 1],
    1: [1, 1, -1],
    2: [-1, 1, -1],
    3: [-1, 1, 1],
    4: [1, -1, 1],
    5: [-1, -1, 1],
    6: [-1, -1, -1],
    7: [1, -1, -1],
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

const CORNER_POSITION_TO_COLOR_MAP: Record<
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

function cornerCubie333PositionToTransform(position: number): GroupProps {
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

function cornerCubie333OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 2) {
    throw new Error(
      `Invalid orientation for corner cubie (must be in range [0, 2]): ${orientation}`
    );
  }
  return {
    quaternion: CORNER_ORIENTATION_TO_ROTATION[orientation],
  };
}

function cornerCubie333IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 7) {
    throw new Error(
      `Invalid position for corner cubie (must be in range [0, 7]): ${position}`
    );
  }
  return CORNER_POSITION_TO_COLOR_MAP[position];
}

export const CornerCubie = generateCubieType<BoxFace>(
  cornerCubie333PositionToTransform,
  cornerCubie333OrientationToTransform,
  cornerCubie333IdToColors,
  CornerGeometrySource
);
