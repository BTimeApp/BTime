import type { RoomEvent } from "@btime/types";

import { ROOM_EVENTS_INFO } from "@btime/types";
import { randomScrambleForEvent } from "cubing/scramble";

export async function generateScramble(event: RoomEvent): Promise<string> {
  const scrambleAlg = await randomScrambleForEvent(
    ROOM_EVENTS_INFO[event]?.scrambleName,
  );
  return scrambleAlg.toString();
}

export async function generateScrambles(
  event: RoomEvent,
  numScrambles: number = 1,
): Promise<string[]> {
  return Promise.all(
    Array.from({ length: numScrambles }, async () =>
      (
        await randomScrambleForEvent(ROOM_EVENTS_INFO[event].scrambleName)
      ).toString(),
    ),
  );
}
