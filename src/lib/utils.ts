import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomScrambleForEvent } from "cubing/scramble";
import { RoomEvent } from "@/types/room";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseIntNaN(input: string) {
  //js will parse "" as NaN, so this function protects against this
  const parsedInt = parseInt(input);
  return isNaN(parsedInt) ? 0 : parsedInt;
}

export function toLowerExceptFirst(str: string): string {
  if (!str) {
    return "";
  }
  return str.charAt(0) + str.slice(1).toLowerCase();
}

const EventMapping = new Map<RoomEvent, string>([
  ["222", "222"],
  ["333", "333"],
  ["444", "444"],
  ["555", "555"],
  ["666", "666"],
  ["777", "777"],
  ["megaminx", "minx"],
  ["pyraminx", "pyram"],
  ["skewb", "skewb"],
  ["clock", "clock"],
  ["sq1", "sq1"],
  ["3oh", "333oh"],
  ["3bld", "333bf"],
  ["4bld", "444bf"],
  ["5bld", "555bf"],
]);

export async function generateScramble(event: RoomEvent): Promise<string> {
  const scrambleAlg = await randomScrambleForEvent(EventMapping.get(event)!);
  return scrambleAlg.toString();
}

export async function generateScrambles(
  event: RoomEvent,
  numScrambles: number = 1
): Promise<string[]> {
  return Promise.all(
    Array.from({ length: numScrambles }, async () =>
      (await randomScrambleForEvent(EventMapping.get(event)!)).toString()
    )
  );
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

export async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied text to clipboard.");
  } catch (err) {
    toast.error(`Failed to copy text to clipboard: ${err}`);
  }
}

export function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}

/**
 * Transforms constant names into abbreviations
 *
 * ex. MY_CONSTANT -> mc
 *
 */
export function abbreviate(name: string) {
  return name
    .split("_")
    .map((_) => _[0])
    .join("")
    .toLowerCase();
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function literalKeys<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T & string>;
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
