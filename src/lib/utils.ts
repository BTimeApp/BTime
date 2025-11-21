import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomScrambleForEvent } from "cubing/scramble";
import { RoomEvent } from "@/types/room";
import { Result } from "@/types/result";
import { toast } from "sonner";
import { IAttempt } from "@/types/solve";

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

// export function createResultTextLine(
//   scramble: string,
//   result?: IResult,
//   idx?: number
// ) {
//   return `${idx != null ? idx + 1 + "\t" : ""}${
//     result != null ? Result.fromIResult(result).toString(true) + "\t" : ""
//   }${scramble}`;
// }
// export function createResultTextLines(scrambles: string[], results: IResult[]) {
//   return scrambles
//     .map((scramble, idx) => createResultTextLine(scramble, results[idx], idx))
//     .join("\n");
// }

export function createAttemptTextLine(attempt: IAttempt, userName?: string, printScramble: boolean = true) {
  return (
    (userName ? userName + ": " : "") +
    (attempt.finished
      ? Result.fromIResult(attempt.result).toString(true) + "\t"
      : "") +
    (printScramble ? attempt.scramble : "")
  );
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
export function displayText(name: string) {
  const result = name.split("_").map((_) => _.toLowerCase());
  if (result.length > 0)
    result[0] = result[0].charAt(0)?.toUpperCase() + result[0].slice(1);
  return result.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function literalKeys<T extends Record<string, any>>(obj: T) {
  return Object.keys(obj) as Array<keyof T & string>;
}
