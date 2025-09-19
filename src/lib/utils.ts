import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomScrambleForEvent } from "cubing/scramble";
import { RoomEvent } from "@/types/room";
import { IResult, Result } from "@/types/result";
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

export async function generateScramble(event: RoomEvent) {
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

  const scrambleAlg = await randomScrambleForEvent(EventMapping.get(event)!);
  return scrambleAlg.toString();
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

export function createResultTextLine(
  scramble: string,
  result?: IResult,
  idx?: number
) {
  return `${idx != null ? idx + 1 + '\t': ""}${result ? Result.fromIResult(result).toString(true) +"\t" : ""}${scramble}`;
}
export function createResultTextLines(scrambles: string[], results: IResult[]) {
  return scrambles
    .map((scramble, idx) =>
      createResultTextLine(scramble, results[idx], idx)
    )
    .join("\n");
}

export async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied text to clipboard.");
  } catch (err) {
    toast.error(`Failed to copy text to clipboard: ${err}`);
  }
}
