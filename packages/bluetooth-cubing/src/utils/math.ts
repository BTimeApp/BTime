/**
 * A collection of math utility functions used in cstimer. Adapted from cstimer source.
 */

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
