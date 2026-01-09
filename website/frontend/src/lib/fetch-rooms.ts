import type { IRoomSummary } from "@btime/types";

const ROOM_WINDOW_SIZE = 20;

export interface RoomsData {
  rooms: IRoomSummary[];
  totalPages: number;
  pageNumber: number;
}

export async function fetchRooms(page: number): Promise<RoomsData | null> {
  const res = await fetch(
    `/api/v0/rooms?page=${page}&limit=${ROOM_WINDOW_SIZE}`,
    { method: "GET" }
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  try {
    return {
      rooms: data.rooms,
      totalPages: data.totalPages,
      pageNumber: page,
    };
  } catch (err) {
    console.warn((err as Error).message);
    return null;
  }
}
