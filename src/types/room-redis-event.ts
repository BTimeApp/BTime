export type RoomRedisEvent = {
  roomId: string;
  userId: string;
  event: string;
  args: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
