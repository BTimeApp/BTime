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

export const CENTER_GEOMETRY = new RoundedBoxGeometry(
  0.99,
  0.995,
  0.99,
  4,
  0.07
);
export const EDGE_GEOMETRY = new RoundedBoxGeometry(
  0.995,
  0.995,
  0.995,
  4,
  0.07
);
export const CORNER_GEOMETRY = new RoundedBoxGeometry(
  0.995,
  0.995,
  0.995,
  4,
  0.07
);
