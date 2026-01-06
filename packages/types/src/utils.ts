// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function literalKeys<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T & string>;
}
