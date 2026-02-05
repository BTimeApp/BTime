/**
 * A collection of math utility functions used in cstimer. Adapted from cstimer source.
 */

import type { Quaternion } from "../types";

export function valuedArray(
  len: number,
  val: number | ((num: number) => number)
): number[] {
  const ret = new Array<number>(len);
  const isFun = typeof val == "function";
  for (let i = 0; i < len; i++) {
    ret[i] = isFun ? val(i) : val;
  }
  return ret;
}

export const IDENTITY_QUATERNION: Quaternion = {
  w: 1,
  x: 0,
  y: 0,
  z: 0,
} as const;

/**
 * Invert a quaternion
 */
export function invertQuaternion(q: Quaternion): Quaternion {
  return {
    w: q.w,
    x: -q.x,
    y: -q.y,
    z: -q.z,
  };
}

/**
 * Normalize a quaternion
 */
export function normalizeQuaternion(q: Quaternion): Quaternion {
  const magnitude_inv =
    1 / Math.sqrt(q.w ** 2 + q.x ** 2 + q.y ** 2 + q.z ** 2);

  return {
    w: q.w * magnitude_inv,
    x: q.x * magnitude_inv,
    y: q.y * magnitude_inv,
    z: q.z * magnitude_inv,
  };
}

/**
 * Computes the quaternion multiplication q1 x q2 (applies q1 to q2)
 */
export function applyQuaternion(q1: Quaternion, q2: Quaternion): Quaternion {
  const { w: w1, x: x1, y: y1, z: z1 } = q1;
  const { w: w2, x: x2, y: y2, z: z2 } = q2;

  const quat = {
    w: w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    x: w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    y: w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    z: w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  };
  return normalizeQuaternion(quat);
}
