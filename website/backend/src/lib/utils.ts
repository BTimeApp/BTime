import type { RoomEvent } from "@btime/types";

import { randomScrambleForEvent } from "cubing/scramble";

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
