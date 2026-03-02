import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type BoxFace = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
export const BOX_GEOMETRY_FACE_ORDER: BoxFace[] = [
  "+x",
  "-x",
  "+y",
  "-y",
  "+z",
  "-z",
];

export const centerCubieGeometryGenerator = (sideLength: number = 1) => {
  return new RoundedBoxGeometry(
    0.99 * sideLength,
    0.995 * sideLength,
    0.99 * sideLength,
    4,
    0.07 * sideLength
  );
};
export const edgeCubieGeometryGenerator = (sideLength: number = 1) => {
  return new RoundedBoxGeometry(
    0.995 * sideLength,
    0.995 * sideLength,
    0.995 * sideLength,
    4,
    0.07 * sideLength
  );
};
export const cornerCubieGeometryGenerator = (sideLength: number = 1) => {
  return new RoundedBoxGeometry(
    0.995 * sideLength,
    0.995 * sideLength,
    0.995 * sideLength,
    4,
    0.07 * sideLength
  );
};
