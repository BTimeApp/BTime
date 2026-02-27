import type { BoxFace, GeometrySpec, GroupProps } from "../../types";
import type { Color } from "three";

import { generateCubieType } from "../../primitives";
import {
  BOX_GEOMETRY_FACE_ORDER,
  cornerCubieGeometryGenerator,
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

const PIECE_SCALE_FACTOR_222 = 1.5;
const CORNER_GEOMETRY = cornerCubieGeometryGenerator(PIECE_SCALE_FACTOR_222);

const CornerGeometrySource = (): GeometrySpec<BoxFace> => ({
  geometry: CORNER_GEOMETRY,
  orderedFaces: BOX_GEOMETRY_FACE_ORDER,
});

/**
 * corner positions (and orientations):
 * URF, UBR, ULB, UFL, DFR, DLF, DBL, DRB
 */
const CORNER_POSITION_TO_TRANSLATION: Record<number, [number, number, number]> =
  {
    0: [
      PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
    ],
    1: [
      PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
    ],
    2: [
      -PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
    ],
    3: [
      -PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
    ],
    4: [
      PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
    ],
    5: [
      -PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
      PIECE_SCALE_FACTOR_222 / 2,
    ],
    6: [
      -PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
    ],
    7: [
      PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
      -PIECE_SCALE_FACTOR_222 / 2,
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

function cornerCubie222PositionToTransform(position: number): GroupProps {
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

function cornerCubie222OrientationToTransform(orientation: number): GroupProps {
  if (orientation < 0 || orientation > 2) {
    throw new Error(
      `Invalid orientation for corner cubie (must be in range [0, 2]): ${orientation}`
    );
  }
  return {
    quaternion: CORNER_ORIENTATION_TO_ROTATION[orientation],
  };
}

function cornerCubie222IdToColors(
  position: number
): Partial<Record<BoxFace, Color>> {
  if (position < 0 || position > 7) {
    throw new Error(
      `Invalid id for corner cubie (must be in range [0, 7]): ${position}`
    );
  }
  return CORNER_ID_TO_COLOR_MAP[position];
}

export const CornerCubie222 = generateCubieType<BoxFace>(
  cornerCubie222PositionToTransform,
  cornerCubie222OrientationToTransform,
  cornerCubie222IdToColors,
  CornerGeometrySource
);
