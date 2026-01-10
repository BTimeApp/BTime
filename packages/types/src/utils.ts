/**
 * A utility function used to generate the literal keys of a Record mapping.
 * Do not expose this outside of the @btime/types package, as importing a function from types package isn't preferred.
 * Instead, use a duplicate implementation from somewhere else.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function literalKeys<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T & string>;
}
