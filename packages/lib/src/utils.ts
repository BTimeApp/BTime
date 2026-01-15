/**
 * Transforms constant names into display text names
 *
 * ex. MY_CONSTANT -> My constant
 *
 */
export function displayText(name?: string) {
  if (!name) return "";
  const result = name.split("_").map((_) => _.toLowerCase());
  if (result.length > 0)
    result[0] = result[0].charAt(0)?.toUpperCase() + result[0].slice(1);
  return result.join(" ");
}

export function toLowerExceptFirst(str: string): string {
  if (!str) {
    return "";
  }
  return str.charAt(0) + str.slice(1).toLowerCase();
}

// https://gist.github.com/renaudtertrais/25fc5a2e64fe5d0e86894094c6989e10?permalink_comment_id=3783403
export function zip<T extends any[]>( //eslint-disable-line @typescript-eslint/no-explicit-any
  ...arrays: { [K in keyof T]: T[K] extends any ? T[K][] : never } //eslint-disable-line @typescript-eslint/no-explicit-any
): Array<T> {
  const minLen = Math.min(...arrays.map((arr) => arr.length));
  const [firstArr, ...restArrs] = arrays;

  return firstArr.slice(0, minLen).map((val, i) => {
    return [val, ...restArrs.map((arr) => arr[i])] as T;
  });
}

export function filterRecord<K extends string | number | symbol, V>(
  record: Record<K, V>,
  predicate: (value: V, key: K) => boolean
): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const key in record) {
    const value = record[key];
    if (predicate(value, key)) {
      result[key] = value;
    }
  }

  return result;
}

export function mapRecordValues<K extends string | number | symbol, V, R>(
  record: Record<K, V>,
  mapper: (value: V, key: K) => R
): Record<K, R> {
  const result = {} as Record<K, R>;

  for (const key in record) {
    const value = record[key];
    result[key] = mapper(value, key);
  }

  return result;
}

export function getFirstKey<K extends string | number | symbol>(
  record: Record<K, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  defaultValue: K = "" as K
): K {
  const keys = Object.keys(record) as K[];
  return keys.length > 0 ? keys[0] : defaultValue;
}
