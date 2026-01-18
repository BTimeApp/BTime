import type { GeometrySource } from "../types/geometry";
import type { Color } from "three";

import { COLOR_DARKGRAY } from "../types/colors";
import { resolveGeometrySource } from "../types/geometry";
import { useMemo } from "react";
import { MeshBasicMaterial } from "three";

type CubieProps<F extends string> = {
  colors: Partial<Record<F, Color>>;
  defaultColor?: Color;
  geometrySource: GeometrySource<F>;
};

/**
 * A primitive type that renders an arbitrary geometry with a given coloring order.
 *
 * NOT intended to be used directly in higher-level components. Make a typed Cubie to handle cube-cubie relation correctly (look at CornerCubie)
 */
export function Cubie<F extends string>({
  colors,
  defaultColor = COLOR_DARKGRAY,
  geometrySource,
}: CubieProps<F>) {
  const { geometry, orderedFaces } = useMemo(
    () => resolveGeometrySource(geometrySource),
    [geometrySource]
  );

  const materials = orderedFaces.map(
    (face) =>
      new MeshBasicMaterial({
        color: face in colors ? colors[face] : defaultColor,
      })
  );

  return <mesh geometry={geometry} material={materials} />;
}
