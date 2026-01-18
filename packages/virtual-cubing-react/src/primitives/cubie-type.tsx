import type { GeometrySource, GroupProps } from "../types/geometry";
import type { Color } from "three";

import { Cubie } from "./cubie";
import React from "react";

/**
 * A generic type that dictates the API for a new cubie type.
 * Each cubie (piece) according to KPatternData is composed of position and orientation (and optionally, orientationMod).
 * A properly defined CubieType establishes the mapping between those numbers and:
 *  1) the transformation of the cubie relative to the cube's coordinate system
 *  2) the coloring of the cubie (each position defines a coloring)
 *
 *
 */
export type CubieType = (
  position: number,
  orientation: number
  //options?: unknown
) => React.ReactNode;

/**
 * A function that permits creating new cubie types.
 *
 * This is the function that's intended to be used to declare new cubie types, which are used to implement the actual puzzle.
 *
 *
 * positionToTransform: maps position (KPuzzleData position) to transformation. Uses GroupProps for now for full expressiveness
 * orientationToTransform: maps orientation (KPuzzleData orientation) to transformation. Uses GroupProps for now for full expressiveness.
 * idToColoring: maps cubie id to the color order for a particular GeometrySource.
 */
export function generateCubieType<F extends string>(
  positionToTransform: (position: number) => GroupProps,
  orientationToTransform: (orientation: number) => GroupProps,
  idToColoring: (position: number) => Partial<Record<F, Color>>,
  geometrySource: GeometrySource<F>
): ({
  position,
  orientation,
  id,
}: {
  position: number;
  orientation: number;
  id: number;
}) => React.ReactNode {
  return function CubieType({
    position,
    orientation,
    id,
  }: {
    position: number;
    orientation: number;
    id: number;
  }) {
    const positionTransform = positionToTransform(position);
    const orientationTransform = orientationToTransform(orientation);
    const colors = idToColoring(id);

    return (
      <group {...positionTransform}>
        <group {...orientationTransform}>
          <Cubie colors={colors} geometrySource={geometrySource} />
        </group>
      </group>
    );
  };
}
