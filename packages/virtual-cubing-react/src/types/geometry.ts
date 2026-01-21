import type { ThreeElements } from "@react-three/fiber";
import type { BufferGeometry } from "three";

export type GeometrySpec<F extends string> = {
  geometry: BufferGeometry;
  orderedFaces: F[];
};

/**
 * Allows users to use either a direct GeometrySpec or a generator or a GeometrySpec
 */
export type GeometrySource<F extends string> =
  | GeometrySpec<F>
  | (() => GeometrySpec<F>);

export function resolveGeometrySource<F extends string>(
  source: GeometrySource<F>
): GeometrySpec<F> {
  return typeof source === "function" ? source() : source;
}

export type GroupProps = ThreeElements["group"];
